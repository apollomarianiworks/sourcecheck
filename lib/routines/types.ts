import type { SourceMeshConfidenceLabel } from "@/lib/types";

export type RoutineKind =
  | "daily-misinformation-scan"
  | "monitor-topic"
  | "watch-source"
  | "prepare-debate-brief"
  | "track-viral-claim"
  | "weekly-research-digest"
  | "check-saved-sources"
  | "find-pro-con-arguments";

export interface ProofbaseRoutine {
  id: string;
  kind: RoutineKind;
  title: string;
  prompt: string;
  cadence: "manual" | "daily-ready" | "weekly-ready";
  sourceTargets: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRunResult {
  routineId: string;
  ranAt: string;
  sourcesSearched: string[];
  summary: string;
  newEvidence: { title: string; publisher: string; url: string }[];
  confidence: SourceMeshConfidenceLabel;
  nextRecommendedAction: string;
}
