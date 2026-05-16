import type { SourceMeshUnderstanding } from "@/lib/types";
import { routeSources } from "./source-router";

export interface AdapterRunPlan {
  adapterIds: string[];
  variantLimit: number;
  maxResultsPerAdapter: number;
  timeoutMs: number;
  rationale: string[];
}

export function buildAdapterRunPlan(
  understanding: SourceMeshUnderstanding,
  opts: { maxResultsPerAdapter?: number; timeoutMs?: number } = {}
): AdapterRunPlan {
  const route = routeSources(understanding);
  const highStakes = [
    "health-claim",
    "legal-court-claim",
    "finance-scam-claim",
    "crime-local-claim",
    "ai-deepfake-claim",
    "science-research-claim",
  ].includes(understanding.inputType);

  const variantLimit = understanding.isVague ? 8 : highStakes ? 7 : 6;
  const maxResultsPerAdapter = opts.maxResultsPerAdapter ?? (highStakes ? 5 : 4);
  const timeoutMs = opts.timeoutMs ?? (highStakes ? 9_000 : 7_000);

  return {
    adapterIds: route.adapterIds,
    variantLimit,
    maxResultsPerAdapter,
    timeoutMs,
    rationale: [
      ...route.rationale,
      understanding.isVague
        ? "Vague input gets more query variants but still bounded adapter result caps."
        : "Specific input gets tighter variant fanout to reduce duplicate evidence.",
    ],
  };
}
