"use client";

import type { CheckResult } from "@/lib/types";

export interface SavedCheck {
  id: string;
  savedAt: string;
  input: string;
  mode: CheckResult["mode"];
  depth: CheckResult["depth"];
  confidenceLabel: string;
  evidenceCount: number;
  result: CheckResult;
}

export interface SavedChecksAdapter {
  list: () => SavedCheck[];
  save: (result: CheckResult) => SavedCheck[];
  remove: (id: string) => SavedCheck[];
  clear: () => void;
}

const KEY = "proofbase.saved.v1";
const MAX_SAVED = 50;

export const localSavedChecks: SavedChecksAdapter = {
  list,
  save,
  remove,
  clear,
};

export const savedChecksAdaptersTodo = [
  "FirestoreSavedChecksAdapter",
  "CloudflareD1SavedChecksAdapter",
  "CloudflareKVSavedChecksAdapter",
];

function list(): SavedCheck[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as SavedCheck[] : [];
  } catch {
    return [];
  }
}

function save(result: CheckResult): SavedCheck[] {
  const ls = storage();
  if (!ls) return [];
  const entry: SavedCheck = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    input: result.input,
    mode: result.mode,
    depth: result.depth,
    confidenceLabel: result.sourceMesh?.confidenceLabel ?? result.confidence.level,
    evidenceCount: result.evidence.length,
    result,
  };
  const next = [entry, ...list().filter((item) => item.input !== result.input || item.mode !== result.mode)].slice(0, MAX_SAVED);
  try {
    ls.setItem(KEY, JSON.stringify(next));
  } catch {
    return list();
  }
  return next;
}

function remove(id: string): SavedCheck[] {
  const ls = storage();
  if (!ls) return [];
  const next = list().filter((item) => item.id !== id);
  try {
    ls.setItem(KEY, JSON.stringify(next));
  } catch {
    return list();
  }
  return next;
}

function clear(): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.removeItem(KEY);
  } catch {
    // localStorage disabled or unavailable
  }
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
