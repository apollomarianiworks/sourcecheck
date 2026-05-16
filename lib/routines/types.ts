import type { EvidenceItem, SourceMeshConfidenceLabel } from "@/lib/types";

export type RoutineCategory =
  | "topic-watch"
  | "debate-prep"
  | "source-monitor"
  | "social-claim-monitor"
  | "research-digest"
  | "trend-scanner"
  | "daily-briefing"
  | "collection-updater"
  | "article-finder"
  | "context-monitor";

export type RoutineKind = RoutineCategory;

export type RoutineCadence = "manual" | "daily-ready" | "weekly-ready" | "monthly-ready";

export type RoutineVisibility = "private-local" | "share-ready" | "public-future";

export interface RoutineSourceTarget {
  id: string;
  label: string;
  type: "adapter" | "domain" | "rss" | "platform" | "collection" | "source-type";
  value: string;
}

export interface ProofbaseRoutine {
  id: string;
  kind: RoutineKind;
  title: string;
  description: string;
  prompt: string;
  cadence: RoutineCadence;
  tags: string[];
  sourceTargets: RoutineSourceTarget[];
  querySeeds: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  visibility: RoutineVisibility;
  schedule: {
    enabled: false;
    provider: "manual-only" | "vercel-cron-future" | "firebase-scheduled-future" | "cloudflare-cron-future";
    note: string;
  };
}

export interface RoutineEvidenceUpdate {
  title: string;
  publisher: string;
  url: string;
  snippet: string;
  date: string | null;
  evidenceType: EvidenceItem["evidenceType"];
  strength: "strongest" | "weakest" | "context";
}

export interface RoutineRunResult {
  id: string;
  routineId: string;
  routineTitle: string;
  routineKind: RoutineKind;
  ranAt: string;
  sourcesSearched: string[];
  searchedQueries: string[];
  summary: string;
  digest: string[];
  evidenceUpdates: RoutineEvidenceUpdate[];
  strongestEvidence: RoutineEvidenceUpdate[];
  weakestEvidence: RoutineEvidenceUpdate[];
  relatedClaims: string[];
  suggestedFollowups: string[];
  unresolvedQuestions: string[];
  confidence: SourceMeshConfidenceLabel;
  previousConfidence: SourceMeshConfidenceLabel | null;
  confidenceChanged: boolean;
  nextRecommendedAction: string;
  automationStatus: "manual-run";
}

export interface RoutineShareDraft {
  routineId: string;
  title: string;
  summary: string;
  cloneable: boolean;
  visibility: RoutineVisibility;
}
