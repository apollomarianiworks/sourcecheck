"use client";

/**
 * Client-side per-user rate limits backed by localStorage. These are an
 * anti-spam convenience — Firestore rules are the real enforcer.
 *
 * Window sizes are conservative on purpose so a fresh user can post a few
 * things in a session, but a single user can't flood the feed.
 */

const KEY = "proofmedia.restrictions.v1";
const CONTENT_KEY = "proofmedia.content-fingerprints.v1";
const LINK_KEY = "proofmedia.link-fingerprints.v1";

interface ActionLog {
  [action: string]: number[];  // timestamps within the window
}

function load(): ActionLog {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as ActionLog; }
  catch { return {}; }
}
function save(log: ActionLog): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(log)); } catch { /* ignore */ }
}

interface Rule { windowMs: number; maxInWindow: number; label: string; }

const RULES: Record<string, Rule> = {
  "create-claim":   { windowMs: 60 * 60 * 1000,        maxInWindow:  6, label: "claims per hour" },
  "create-comment": { windowMs: 10 * 60 * 1000,        maxInWindow: 20, label: "comments per 10 min" },
  "vote":           { windowMs: 60 * 1000,             maxInWindow: 30, label: "votes per minute" },
  "save":           { windowMs: 60 * 1000,             maxInWindow: 30, label: "saves per minute" },
  "report":         { windowMs: 24 * 60 * 60 * 1000,   maxInWindow: 20, label: "reports per day" },
};

export interface RestrictionCheck { allowed: boolean; reason?: string; retryAfterSec?: number; }

export function checkRestriction(action: keyof typeof RULES): RestrictionCheck {
  const rule = RULES[action];
  if (!rule) return { allowed: true };
  const log = load();
  const now = Date.now();
  const cutoff = now - rule.windowMs;
  const hits = (log[action] ?? []).filter((t) => t >= cutoff);
  if (hits.length >= rule.maxInWindow) {
    const oldest = hits[0];
    const wait = Math.max(0, oldest + rule.windowMs - now);
    return {
      allowed: false,
      reason: `Rate limit: max ${rule.maxInWindow} ${rule.label}.`,
      retryAfterSec: Math.ceil(wait / 1000),
    };
  }
  return { allowed: true };
}

export function recordAction(action: keyof typeof RULES): void {
  const rule = RULES[action];
  if (!rule) return;
  const log = load();
  const now = Date.now();
  const cutoff = now - rule.windowMs;
  log[action] = [...(log[action] ?? []).filter((t) => t >= cutoff), now];
  save(log);
}

/**
 * Server-side / role-based gating. We check the user's `restrictions` array
 * (set by moderators in Firestore) before allowing posting actions.
 */
export function isRestricted(restrictions: string[] | undefined, action: "post" | "comment" | "vote" | "save" | "report"): boolean {
  if (!restrictions || restrictions.length === 0) return false;
  if (restrictions.includes(`no-${action}`)) return true;
  if (restrictions.includes("banned"))       return true;
  return false;
}

interface FingerprintRow {
  value: string;
  at: number;
}

function readFingerprints(key: string): FingerprintRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as FingerprintRow[] : [];
  } catch {
    return [];
  }
}

function writeFingerprints(key: string, rows: FingerprintRow[]): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(rows.slice(0, 300))); } catch { /* ignore */ }
}

function normalizeContent(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function normalizeLink(input: string): string {
  try {
    const url = new URL(input);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.toLowerCase();
  } catch {
    return input.toLowerCase().trim();
  }
}

export function checkDuplicateContent(kind: "claim" | "comment", text: string): RestrictionCheck {
  const fingerprint = normalizeContent(text);
  if (fingerprint.length < 40) return { allowed: true };
  const recentWindow = 60 * 60 * 1000;
  const rows = readFingerprints(CONTENT_KEY).filter((r) => Date.now() - r.at < recentWindow);
  if (rows.some((r) => r.value === `${kind}:${fingerprint}`)) {
    return {
      allowed: false,
      reason: "This looks very similar to something recently posted from this browser. Add new evidence or context before posting again.",
    };
  }
  return { allowed: true };
}

export function recordContentFingerprint(kind: "claim" | "comment", text: string): void {
  const fingerprint = normalizeContent(text);
  if (fingerprint.length < 40) return;
  writeFingerprints(CONTENT_KEY, [{ value: `${kind}:${fingerprint}`, at: Date.now() }, ...readFingerprints(CONTENT_KEY)]);
}

export function checkRepeatedLinks(urls: string[]): RestrictionCheck {
  const normalized = urls.map(normalizeLink).filter(Boolean);
  if (normalized.length === 0) return { allowed: true };
  const recentWindow = 60 * 60 * 1000;
  const rows = readFingerprints(LINK_KEY).filter((r) => Date.now() - r.at < recentWindow);
  const repeats = normalized.filter((url) => rows.some((r) => r.value === url));
  if (repeats.length >= Math.min(2, normalized.length)) {
    return {
      allowed: false,
      reason: "These links were posted very recently from this browser. Repeated link blasts are blocked to keep the evidence feed useful.",
    };
  }
  return { allowed: true };
}

export function recordLinkFingerprints(urls: string[]): void {
  const rows = urls.map((url) => ({ value: normalizeLink(url), at: Date.now() })).filter((row) => row.value);
  if (rows.length === 0) return;
  writeFingerprints(LINK_KEY, [...rows, ...readFingerprints(LINK_KEY)]);
}
