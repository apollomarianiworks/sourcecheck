"use client";

import type { ProofbaseRoutine, RoutineRunResult } from "@/lib/routines/types";
import type { ResearchCollection } from "./collections";

export interface ProofbaseStorageAdapter {
  id: "local-storage" | "firestore-placeholder" | "d1-placeholder";
  listCollections: () => ResearchCollection[];
  saveCollection: (collection: ResearchCollection) => void;
  listRoutines: () => ProofbaseRoutine[];
  saveRoutine: (routine: ProofbaseRoutine) => void;
  listRoutineRuns: () => RoutineRunResult[];
  saveRoutineRun: (run: RoutineRunResult) => void;
}

const ROUTINES_KEY = "proofbase.routines.v1";
const ROUTINE_RUNS_KEY = "proofbase.routineRuns.v1";

export const localStorageProvider: ProofbaseStorageAdapter = {
  id: "local-storage",
  listCollections: () => read("proofbase.collections.v1"),
  saveCollection: (collection) => upsert("proofbase.collections.v1", collection),
  listRoutines: () => read(ROUTINES_KEY),
  saveRoutine: (routine) => upsert(ROUTINES_KEY, routine),
  listRoutineRuns: () => read(ROUTINE_RUNS_KEY),
  saveRoutineRun: (run) => prepend(ROUTINE_RUNS_KEY, run, 100),
};

export function getStorageProvider(): ProofbaseStorageAdapter {
  return localStorageProvider;
}

export const FUTURE_STORAGE_ADAPTERS = [
  "Firestore adapter for accounts, cloud collections, routines, and public claims.",
  "Cloudflare D1/KV adapter for low-cost account-aware storage.",
];

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function upsert<T extends { id: string; updatedAt?: string }>(key: string, item: T) {
  const now = new Date().toISOString();
  const next = [{ ...item, updatedAt: now }, ...read<T>(key).filter((existing) => existing.id !== item.id)].slice(0, 200);
  window.localStorage.setItem(key, JSON.stringify(next));
}

function prepend<T>(key: string, item: T, limit: number) {
  window.localStorage.setItem(key, JSON.stringify([item, ...read<T>(key)].slice(0, limit)));
}
