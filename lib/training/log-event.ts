"use client";

import type { CheckResult } from "@/lib/types";
import type { ProofbaseTrainingEvent, TrainingFeedbackKind } from "./types";

const KEY = "proofbase.training.events.v1";

export function buildTrainingEvent(result: CheckResult, feedback: TrainingFeedbackKind, correctionNotes = ""): ProofbaseTrainingEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: result.input,
    cleanedQuery: result.normalizedInput,
    generatedSearchVariants: result.sourceMesh?.searchVariants ?? result.searchVariants.map((item) => item.query),
    selectedSources: result.sourceCoverage.filter((source) => source.status === "ok").map((source) => source.name),
    evidenceLabels: result.evidence.map((item) => item.evidenceType),
    confidenceLabel: result.sourceMesh?.confidenceLabel ?? "not-run",
    userFeedback: feedback,
    finalSummary: result.summary,
    correctionNotes,
    timestamp: new Date().toISOString(),
    privacy: {
      containsPrivateUserData: false,
      includesApiKeys: false,
      includesPrivateSocialContent: false,
    },
  };
}

export function logTrainingEvent(event: ProofbaseTrainingEvent): ProofbaseTrainingEvent[] {
  const current = listTrainingEvents();
  const next = [event, ...current].slice(0, 500);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function listTrainingEvents(): ProofbaseTrainingEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as ProofbaseTrainingEvent[] : [];
  } catch {
    return [];
  }
}
