import { runSourceMesh } from "@/lib/sourcemesh/search";
import type { EvidenceItem, SourceMeshConfidenceLabel } from "@/lib/types";
import type { ProofbaseRoutine, RoutineEvidenceUpdate, RoutineRunResult } from "./types";

export async function runRoutine(
  routine: ProofbaseRoutine,
  opts: { previousConfidence?: SourceMeshConfidenceLabel | null } = {}
): Promise<RoutineRunResult> {
  const queries = buildRoutineQueries(routine);
  const results = await Promise.allSettled(
    queries.slice(0, 5).map((query) => runSourceMesh(query, { maxResultsPerAdapter: 3, timeoutMs: 7_500 }))
  );
  const fulfilled = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof runSourceMesh>>> => result.status === "fulfilled");
  const evidence = dedupeEvidence(fulfilled.flatMap((result) => result.value.evidence)).slice(0, 40);
  const firstReport = fulfilled[0]?.value.report ?? null;
  const confidence = confidenceFromRuns(fulfilled.map((result) => result.value.report.confidenceLabel));
  const sourcesSearched = Array.from(new Set(
    fulfilled.flatMap((result) =>
      result.value.report.sourcesChecked
        .filter((source) => source.status !== "not-applicable")
        .map((source) => `${source.name}: ${source.status}${source.itemCount ? ` (${source.itemCount})` : ""}`)
    )
  ));
  const strongestEvidence = evidence.slice(0, 6).map((item) => toUpdate(item, "strongest"));
  const weakestEvidence = evidence.slice(-4).map((item) => toUpdate(item, "weakest"));
  const suggestedFollowups = Array.from(new Set(fulfilled.flatMap((result) => result.value.report.suggestedSearches))).slice(0, 8);
  const unresolvedQuestions = buildUnresolvedQuestions(routine, firstReport?.missingEvidence ?? []);
  const previousConfidence = opts.previousConfidence ?? null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    routineId: routine.id,
    routineTitle: routine.title,
    routineKind: routine.kind,
    ranAt: new Date().toISOString(),
    sourcesSearched,
    searchedQueries: queries,
    summary: buildSummary(routine, evidence.length, confidence, previousConfidence),
    digest: buildDigest(routine, evidence, firstReport?.missingEvidence ?? []),
    evidenceUpdates: [
      ...strongestEvidence,
      ...weakestEvidence,
      ...evidence.slice(6, 12).map((item) => toUpdate(item, "context")),
    ],
    strongestEvidence,
    weakestEvidence,
    relatedClaims: Array.from(new Set(fulfilled.flatMap((result) => result.value.report.evidenceFound))).slice(0, 6),
    suggestedFollowups,
    unresolvedQuestions,
    confidence,
    previousConfidence,
    confidenceChanged: !!previousConfidence && previousConfidence !== confidence,
    nextRecommendedAction: suggestedFollowups[0] ?? unresolvedQuestions[0] ?? "Run again after adding a narrower date, source, platform, or location.",
    automationStatus: "manual-run",
  };
}

export function buildRoutineQueries(routine: ProofbaseRoutine): string[] {
  const kindPrefix: Record<ProofbaseRoutine["kind"], string[]> = {
    "topic-watch": ["latest evidence", "official update", "conflicting reporting"],
    "debate-prep": ["strongest pro arguments evidence", "strongest con arguments evidence", "rebuttals statistics expert sources"],
    "source-monitor": ["latest coverage", "new release", "official update"],
    "social-claim-monitor": ["viral claim fact check", "original source", "corroborating evidence"],
    "research-digest": ["new research", "recent study", "policy update"],
    "trend-scanner": ["emerging narrative", "viral discussion", "weak evidence"],
    "daily-briefing": ["latest developments", "today official update", "fact check"],
    "collection-updater": ["new evidence", "missing primary source", "timeline update"],
    "article-finder": ["best articles", "analysis", "opposing views"],
    "context-monitor": ["background context", "timeline", "why controversial"],
  };
  const base = routine.querySeeds[0] || routine.prompt;
  return Array.from(new Set([
    routine.prompt,
    ...routine.querySeeds.map((seed) => `${base} ${seed}`),
    ...kindPrefix[routine.kind].map((seed) => `${base} ${seed}`),
  ])).slice(0, 8);
}

function confidenceFromRuns(labels: SourceMeshConfidenceLabel[]): SourceMeshConfidenceLabel {
  if (labels.includes("Strong evidence found")) return "Strong evidence found";
  if (labels.includes("Mixed evidence")) return "Mixed evidence";
  if (labels.includes("Moderate evidence found")) return "Moderate evidence found";
  if (labels.includes("Needs primary source")) return "Needs primary source";
  if (labels.includes("Weak evidence found")) return "Weak evidence found";
  if (labels.includes("Too vague to verify")) return "Too vague to verify";
  return labels[0] ?? "No strong evidence found";
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const out: EvidenceItem[] = [];
  for (const item of items) {
    const key = item.url || `${item.publisher}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function toUpdate(item: EvidenceItem, strength: RoutineEvidenceUpdate["strength"]): RoutineEvidenceUpdate {
  return {
    title: item.title,
    publisher: item.publisher,
    url: item.url,
    snippet: item.snippet,
    date: item.date,
    evidenceType: item.evidenceType,
    strength,
  };
}

function buildSummary(routine: ProofbaseRoutine, evidenceCount: number, confidence: SourceMeshConfidenceLabel, previous: SourceMeshConfidenceLabel | null): string {
  const changed = previous && previous !== confidence ? ` Confidence changed from ${previous} to ${confidence}.` : "";
  return `${routine.title} ran manually and found ${evidenceCount} evidence item(s). Current confidence: ${confidence}.${changed}`;
}

function buildDigest(routine: ProofbaseRoutine, evidence: EvidenceItem[], missing: string[]): string[] {
  const digest = [
    `${routine.kind.replace(/-/g, " ")} scan completed from saved query seeds.`,
    evidence.length > 0
      ? `Strongest visible source: ${evidence[0].publisher} - ${evidence[0].title}`
      : "No new linked evidence was returned by the searched public sources.",
  ];
  if (routine.kind === "debate-prep") digest.push("Use the strongest and weakest evidence sections to separate pro/con packets before arguing.");
  if (routine.kind === "social-claim-monitor") digest.push("Social signals are treated as weak context unless corroborated by independent sources.");
  if (missing.length > 0) digest.push(`Evidence gap: ${missing[0]}`);
  return digest;
}

function buildUnresolvedQuestions(routine: ProofbaseRoutine, missing: string[]): string[] {
  const base = [
    "What primary source would change the confidence level?",
    "Which result is earliest or closest to the original claim?",
  ];
  if (routine.kind === "debate-prep") base.push("Which side has stronger primary-source support right now?");
  if (routine.kind === "source-monitor") base.push("Is the monitored source publishing original reporting or repeating another outlet?");
  if (routine.kind === "social-claim-monitor") base.push("Is this social narrative corroborated outside the platform?");
  return Array.from(new Set([...missing, ...base])).slice(0, 6);
}
