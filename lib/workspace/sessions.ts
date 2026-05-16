"use client";

import type { CheckResult, HistoryEntry } from "@/lib/types";
import type { ProofbaseSearchMode } from "@/lib/search/search-brain";

const SAVED_KEY = "proofbase.workspace.savedSessions.v1";
const RECENT_KEY = "proofbase.workspace.recent.v1";
const MAX_RECENT = 12;

export interface SavedSession {
  id: string;
  title: string;
  query: string;
  mode: ProofbaseSearchMode;
  createdAt: string;
  updatedAt: string;
  evidenceCount?: number;
  sourceQualityScore?: number | null;
}

export interface RecentWorkspaceItem {
  id: string;
  query: string;
  mode: ProofbaseSearchMode;
  checkedAt: string;
  evidenceCount: number;
  verdict: CheckResult["evidenceVerdict"];
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readArray<T>(key: string): T[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const parsed = JSON.parse(ls.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be disabled or full. The app remains usable without it.
  }
}

export function loadSavedSessions(): SavedSession[] {
  return readArray<SavedSession>(SAVED_KEY);
}

export function saveWorkspaceSession(args: {
  query: string;
  mode: ProofbaseSearchMode;
  evidenceCount?: number;
  sourceQualityScore?: number | null;
}): SavedSession[] {
  const now = new Date().toISOString();
  const title = args.query.length > 72 ? `${args.query.slice(0, 72).trim()}...` : args.query;
  const current = loadSavedSessions();
  const existing = current.find((item) => item.query === args.query && item.mode === args.mode);
  const next: SavedSession = {
    id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    query: args.query,
    mode: args.mode,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    evidenceCount: args.evidenceCount,
    sourceQualityScore: args.sourceQualityScore,
  };
  const updated = [next, ...current.filter((item) => item.id !== next.id)].slice(0, 30);
  writeArray(SAVED_KEY, updated);
  return updated;
}

export function loadRecentWorkspace(): RecentWorkspaceItem[] {
  return readArray<RecentWorkspaceItem>(RECENT_KEY);
}

export function appendRecentWorkspace(result: CheckResult, mode: ProofbaseSearchMode): RecentWorkspaceItem[] {
  const entry: RecentWorkspaceItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: result.input,
    mode,
    checkedAt: result.checkedAt,
    evidenceCount: result.evidence.length,
    verdict: result.evidenceVerdict,
  };
  const updated = [
    entry,
    ...loadRecentWorkspace().filter((item) => !(item.query === entry.query && item.mode === entry.mode)),
  ].slice(0, MAX_RECENT);
  writeArray(RECENT_KEY, updated);
  return updated;
}

export function historyToWorkspaceItems(entries: HistoryEntry[]): RecentWorkspaceItem[] {
  return entries.slice(0, MAX_RECENT).map((entry) => ({
    id: entry.id,
    query: entry.input,
    mode: entry.depth === "deep" ? "research" : "quick",
    checkedAt: entry.checkedAt,
    evidenceCount: entry.evidenceCount,
    verdict: entry.verdict,
  }));
}
