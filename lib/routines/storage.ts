"use client";

import type { ProofbaseRoutine, RoutineRunResult, RoutineSourceTarget } from "./types";
import { duplicateRoutine as duplicateRoutineTemplate } from "./templates";

const ROUTINES_KEY = "proofbase.routines.v2";
const LEGACY_ROUTINES_KEY = "proofbase.routines.v1";
const RUNS_KEY = "proofbase.routineRuns.v2";
const LEGACY_RUNS_KEY = "proofbase.routineRuns.v1";

export function listRoutines(): ProofbaseRoutine[] {
  return read<Partial<ProofbaseRoutine> & { sourceTargets?: unknown[] }>(ROUTINES_KEY, LEGACY_ROUTINES_KEY)
    .map(normalizeRoutine)
    .filter((routine): routine is ProofbaseRoutine => !!routine);
}

export function getRoutine(id: string): ProofbaseRoutine | null {
  return listRoutines().find((routine) => routine.id === id) ?? null;
}

export function saveRoutine(routine: ProofbaseRoutine): ProofbaseRoutine[] {
  const now = new Date().toISOString();
  const next = [
    { ...routine, updatedAt: now },
    ...listRoutines().filter((item) => item.id !== routine.id),
  ].slice(0, 200);
  write(ROUTINES_KEY, next);
  return next;
}

export function deleteRoutine(id: string): ProofbaseRoutine[] {
  const next = listRoutines().filter((routine) => routine.id !== id);
  write(ROUTINES_KEY, next);
  return next;
}

export function duplicateRoutine(routine: ProofbaseRoutine): ProofbaseRoutine[] {
  return saveRoutine(duplicateRoutineTemplate(routine));
}

export function listRoutineRuns(routineId?: string): RoutineRunResult[] {
  const runs = read<RoutineRunResult>(RUNS_KEY, LEGACY_RUNS_KEY);
  return routineId ? runs.filter((run) => run.routineId === routineId) : runs;
}

export function saveRoutineRun(run: RoutineRunResult): RoutineRunResult[] {
  const next = [run, ...listRoutineRuns().filter((item) => item.id !== run.id)].slice(0, 500);
  write(RUNS_KEY, next);
  const routine = getRoutine(run.routineId);
  if (routine) saveRoutine({ ...routine, lastRunAt: run.ranAt });
  return next;
}

export function latestRunFor(routineId: string): RoutineRunResult | null {
  return listRoutineRuns(routineId)[0] ?? null;
}

export function routineShareDraft(routine: ProofbaseRoutine) {
  return {
    routineId: routine.id,
    title: routine.title,
    summary: `${routine.title} is a ${routine.kind.replace(/-/g, " ")} routine with ${routine.querySeeds.length} query seed(s).`,
    cloneable: true,
    visibility: routine.visibility,
  };
}

function read<T>(key: string, legacyKey?: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key) ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null) ?? "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRoutine(raw: Partial<ProofbaseRoutine> & { sourceTargets?: unknown[] }): ProofbaseRoutine | null {
  if (!raw?.id || !raw.title || !raw.prompt || !raw.kind) return null;
  const now = new Date().toISOString();
  const sourceTargets = Array.isArray(raw.sourceTargets)
    ? raw.sourceTargets.map((item, index) => normalizeTarget(item, index)).filter((item): item is RoutineSourceTarget => !!item)
    : [];
  return {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    description: raw.description ?? raw.prompt,
    prompt: raw.prompt,
    cadence: raw.cadence ?? "manual",
    tags: raw.tags ?? [raw.kind.replace(/-/g, " ")],
    sourceTargets,
    querySeeds: raw.querySeeds ?? [raw.prompt],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    lastRunAt: raw.lastRunAt ?? null,
    visibility: raw.visibility ?? "private-local",
    schedule: raw.schedule ?? {
      enabled: false,
      provider: "manual-only",
      note: "Manual runs only. Scheduling is future-ready.",
    },
  };
}

function normalizeTarget(item: unknown, index: number): RoutineSourceTarget | null {
  if (typeof item === "string") {
    return { id: `legacy-${index}`, label: item, type: "source-type", value: item };
  }
  if (item && typeof item === "object" && "label" in item && "type" in item && "value" in item) {
    return item as RoutineSourceTarget;
  }
  return null;
}
