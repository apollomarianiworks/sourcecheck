"use client";

import type { CheckResult, HistoryEntry } from "./types";

const KEY = "sourcecheck.history.v1";
const MAX_ENTRIES = 20;

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadHistory(): HistoryEntry[] {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(result: CheckResult): HistoryEntry[] {
  const ls = safeLocalStorage();
  if (!ls) return [];

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode: result.mode,
    depth: result.depth,
    input: result.input,
    score: result.sourceQualityScore,
    verdict: result.evidenceVerdict,
    evidenceCount: result.evidence.length,
    checkedAt: result.checkedAt,
  };

  const current = loadHistory();
  // Drop any prior entry with the same mode+input
  const filtered = current.filter(
    (e) => !(e.mode === entry.mode && e.input === entry.input)
  );
  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);

  try {
    ls.setItem(KEY, JSON.stringify(updated));
  } catch {
    // quota exceeded or storage disabled; ignore silently
  }
  return updated;
}

export function clearHistory(): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try { ls.removeItem(KEY); } catch { /* ignore */ }
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const ls = safeLocalStorage();
  if (!ls) return [];
  const updated = loadHistory().filter((e) => e.id !== id);
  try { ls.setItem(KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}
