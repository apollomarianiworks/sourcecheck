import { runSourceMesh } from "@/lib/sourcemesh/search";
import type { ProofbaseRoutine, RoutineRunResult } from "./types";

export async function runRoutine(routine: ProofbaseRoutine): Promise<RoutineRunResult> {
  const mesh = await runSourceMesh(routine.prompt, { maxResultsPerAdapter: 3, timeoutMs: 7_000 });
  const sourcesSearched = mesh.report.sourcesChecked
    .filter((source) => source.status === "ok" || source.status === "no-key" || source.status === "error")
    .map((source) => `${source.name}: ${source.status}`);
  return {
    routineId: routine.id,
    ranAt: new Date().toISOString(),
    sourcesSearched,
    summary: mesh.evidence.length
      ? `Found ${mesh.evidence.length} evidence item(s). ${mesh.report.confidenceLabel}.`
      : "No strong evidence found in this manual routine run.",
    newEvidence: mesh.evidence.slice(0, 6).map((item) => ({ title: item.title, publisher: item.publisher, url: item.url })),
    confidence: mesh.report.confidenceLabel,
    nextRecommendedAction: mesh.report.suggestedBetterInputs[0] ?? mesh.report.suggestedSearches[0] ?? "Narrow the routine prompt with a date, source, or location.",
  };
}
