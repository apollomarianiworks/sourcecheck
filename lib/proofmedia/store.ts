"use client";

/**
 * Local-only persistence layer for ProofMedia (PASS 16).
 *
 *  - Everything lives in this browser's localStorage.
 *  - No network calls. No fan-out to other users.
 *  - When the user signs in via a real provider later, a future pass can migrate
 *    these rows to a server store. The types are designed to make that trivial.
 *
 * Every entity is keyed by `proofmedia.<type>.v1`. Keys are intentionally
 * versioned so a schema bump just lives alongside the old data instead of
 * silently wiping it.
 */

import type {
  ClaimThread, Collection, DebateRoom, ResearchProfile, TopicFollow,
  ReportFlag, EvidenceDispute, MisinformationWarning,
} from "./types";

const KEYS = {
  claims:        "proofmedia.claims.v1",
  collections:   "proofmedia.collections.v1",
  debates:       "proofmedia.debates.v1",
  profile:       "proofmedia.profile.v1",
  follows:       "proofmedia.follows.v1",
  reports:       "proofmedia.reports.v1",
  disputes:      "proofmedia.disputes.v1",
  warnings:      "proofmedia.warnings.v1",
} as const;

function safeLS(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function readArray<T>(key: string): T[] {
  const ls = safeLS();
  if (!ls) return [];
  try {
    const raw = ls.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch { return []; }
}

function writeArray<T>(key: string, value: T[]): void {
  const ls = safeLS();
  if (!ls) return;
  try { ls.setItem(key, JSON.stringify(value)); } catch { /* quota etc — ignore */ }
}

function readObject<T>(key: string): T | null {
  const ls = safeLS();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

function writeObject<T>(key: string, value: T | null): void {
  const ls = safeLS();
  if (!ls) return;
  try {
    if (value === null) ls.removeItem(key);
    else ls.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ── Claims ────────────────────────────────────────────────────────────────
export const ClaimStore = {
  list:    (): ClaimThread[]    => readArray<ClaimThread>(KEYS.claims),
  get:     (id: string)          => ClaimStore.list().find((c) => c.id === id) ?? null,
  upsert:  (c: ClaimThread)      => { const xs = ClaimStore.list().filter((x) => x.id !== c.id); writeArray(KEYS.claims, [c, ...xs]); return c; },
  remove:  (id: string)          => writeArray(KEYS.claims, ClaimStore.list().filter((c) => c.id !== id)),
  clear:   ()                    => writeArray(KEYS.claims, []),
};

// ── Collections ───────────────────────────────────────────────────────────
export const CollectionStore = {
  list:    (): Collection[]      => readArray<Collection>(KEYS.collections),
  get:     (id: string)          => CollectionStore.list().find((c) => c.id === id) ?? null,
  upsert:  (c: Collection)       => { const xs = CollectionStore.list().filter((x) => x.id !== c.id); writeArray(KEYS.collections, [c, ...xs]); return c; },
  remove:  (id: string)          => writeArray(KEYS.collections, CollectionStore.list().filter((c) => c.id !== id)),
  clear:   ()                    => writeArray(KEYS.collections, []),
};

// ── Debates ───────────────────────────────────────────────────────────────
export const DebateStore = {
  list:    (): DebateRoom[]      => readArray<DebateRoom>(KEYS.debates),
  get:     (id: string)          => DebateStore.list().find((d) => d.id === id) ?? null,
  upsert:  (d: DebateRoom)       => { const xs = DebateStore.list().filter((x) => x.id !== d.id); writeArray(KEYS.debates, [d, ...xs]); return d; },
  remove:  (id: string)          => writeArray(KEYS.debates, DebateStore.list().filter((d) => d.id !== id)),
  clear:   ()                    => writeArray(KEYS.debates, []),
};

// ── Profile (singleton — the local user's profile) ────────────────────────
export const ProfileStore = {
  get:    (): ResearchProfile | null => readObject<ResearchProfile>(KEYS.profile),
  set:    (p: ResearchProfile | null) => writeObject(KEYS.profile, p),
};

// ── Topic follows ─────────────────────────────────────────────────────────
export const FollowStore = {
  list:   (): TopicFollow[]           => readArray<TopicFollow>(KEYS.follows),
  has:    (tag: string)               => FollowStore.list().some((f) => f.tag.toLowerCase() === tag.toLowerCase()),
  add:    (tag: string)               => { if (FollowStore.has(tag)) return; writeArray(KEYS.follows, [{ tag, followedAt: new Date().toISOString() }, ...FollowStore.list()]); },
  remove: (tag: string)               => writeArray(KEYS.follows, FollowStore.list().filter((f) => f.tag.toLowerCase() !== tag.toLowerCase())),
};

// ── Moderation rows (architecture-only; no panel yet) ─────────────────────
export const ReportStore = {
  list:   (): ReportFlag[]        => readArray<ReportFlag>(KEYS.reports),
  add:    (r: ReportFlag)         => writeArray(KEYS.reports, [r, ...ReportStore.list()]),
};
export const DisputeStore = {
  list:   (): EvidenceDispute[]   => readArray<EvidenceDispute>(KEYS.disputes),
  add:    (d: EvidenceDispute)    => writeArray(KEYS.disputes, [d, ...DisputeStore.list()]),
};
export const WarningStore = {
  list:   (): MisinformationWarning[] => readArray<MisinformationWarning>(KEYS.warnings),
  add:    (w: MisinformationWarning) => writeArray(KEYS.warnings, [w, ...WarningStore.list()]),
};

// ── Counts for empty-state copy ───────────────────────────────────────────
export function localCounts() {
  return {
    claims:      ClaimStore.list().length,
    collections: CollectionStore.list().length,
    debates:     DebateStore.list().length,
    follows:     FollowStore.list().length,
    profileSet:  ProfileStore.get() !== null,
  };
}
