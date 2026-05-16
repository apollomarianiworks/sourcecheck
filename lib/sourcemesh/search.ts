import { multiSearch } from "@/lib/sources";
import { toEvidenceItem } from "@/lib/sources/types";
import type { CheckResult, EvidenceItem, SearchVariantUsed, SourceMeshReport, SourceMeshSourceChecked } from "@/lib/types";
import { extractSocialMetadata } from "@/lib/social/extract-social-metadata";
import { scoreSocialSource } from "@/lib/social/social-score";
import { sourceRegistry, optionalIntegrationStatus } from "./registry";
import { understandQuery, generateSearchVariants } from "./query-understanding";
import { routeSources } from "./source-router";
import { buildEvidenceMap, rankEvidence } from "./evidence-ranker";
import { sourceMeshConfidence } from "./confidence";
import { buildFollowups } from "./followups";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: SourceMeshSearchResult }>();

export interface SourceMeshSearchResult {
  report: SourceMeshReport;
  evidence: EvidenceItem[];
  searchVariantsUsed: SearchVariantUsed[];
  coverage: CheckResult["sourceCoverage"];
  category: CheckResult["claimCategory"];
  coverageLevel: CheckResult["coverageLevel"];
}

export async function runSourceMesh(input: string, opts: { maxResultsPerAdapter?: number; timeoutMs?: number } = {}): Promise<SourceMeshSearchResult> {
  const cacheKey = JSON.stringify({ input: input.trim().toLowerCase(), opts });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const understanding = understandQuery(input);
  const variants = generateSearchVariants(understanding);
  const routePlan = routeSources(understanding);
  const registry = sourceRegistry();
  const social = understanding.inputType === "social-url"
    ? await buildSocialBlock(input, variants[0] ?? "")
    : null;

  const variantResults = await Promise.allSettled(
    variants.slice(0, 6).map((query) =>
      multiSearch(query, {
        timeoutMs: opts.timeoutMs ?? 8_000,
        maxResultsPerAdapter: opts.maxResultsPerAdapter ?? 4,
        forceInclude: routePlan.adapterIds,
        claimCategories: understanding.categories,
      })
    )
  );

  const evidence: EvidenceItem[] = [];
  const variantsUsed: SearchVariantUsed[] = [];
  const coverageMap = new Map<string, SourceMeshSourceChecked>();

  for (let i = 0; i < variantResults.length; i++) {
    const query = variants[i];
    const settled = variantResults[i];
    if (settled.status === "rejected") {
      variantsUsed.push({ label: "sourcemesh:error", query, resultCount: 0 });
      continue;
    }

    const ms = settled.value;
    variantsUsed.push({ label: `sourcemesh:${i + 1}`, query, resultCount: ms.evidence.length });
    evidence.push(...ms.evidence.map((n) => toEvidenceItem(n) as EvidenceItem));
    for (const result of ms.results) {
      const reg = registry.find((r) => r.id === result.adapter);
      const prev = coverageMap.get(result.adapter);
      const merged: SourceMeshSourceChecked = {
        adapter: result.adapter,
        name: result.name,
        status: mergeStatus(prev?.status, result.status),
        itemCount: (prev?.itemCount ?? 0) + result.items.length,
        requiresKey: result.requiresKey,
        optional: reg?.optional ?? result.requiresKey,
        quality: reg?.quality ?? "context",
        notes: reg?.notes ?? "Public source adapter.",
        errorMessage: result.errorMessage ?? prev?.errorMessage,
        durationMs: (prev?.durationMs ?? 0) + result.durationMs,
      };
      coverageMap.set(result.adapter, merged);
    }
  }

  for (const reg of registry) {
    if (coverageMap.has(reg.id)) continue;
    coverageMap.set(reg.id, {
      adapter: reg.id,
      name: reg.name,
      status: reg.available ? "not-applicable" : reg.requiresKey ? "no-key" : "skipped",
      itemCount: 0,
      requiresKey: reg.requiresKey,
      optional: reg.optional,
      quality: reg.quality,
      notes: reg.notes,
    });
  }

  const deduped = dedupeEvidence(evidence);
  const ranked = rankEvidence(deduped).slice(0, 40);
  const coverage = Array.from(coverageMap.values()).map((s) => ({
    adapter: s.adapter,
    name: s.name,
    status: s.status,
    itemCount: s.itemCount,
    errorMessage: s.errorMessage,
    durationMs: s.durationMs,
    requiresKey: s.requiresKey,
  }));
  const okCount = coverage.filter((c) => c.status === "ok" && c.itemCount > 0).length;
  const coverageLevel: CheckResult["coverageLevel"] = okCount >= 5 ? "high" : okCount >= 2 ? "medium" : "low";

  const provisional = {
    evidence: ranked,
    evidenceVerdict: verdictFromEvidence(ranked),
    confidence: confidenceFromEvidence(ranked, coverageLevel),
    coverageLevel,
  };
  const meshConfidence = sourceMeshConfidence(provisional, understanding);
  const followups = buildFollowups(understanding, variants);
  const evidenceMap = buildEvidenceMap(ranked);

  const report: SourceMeshReport = {
    pipeline: [
      "Input understanding",
      "Query cleanup",
      "Claim/entity extraction",
      "Category detection",
      "Source routing",
      "Multi-source search",
      "Evidence deduplication",
      "Source scoring",
      "Confidence scoring",
      "Plain-English result summary",
      "Suggested follow-up searches",
    ],
    understanding,
    searchVariants: variants,
    sourcesChecked: Array.from(coverageMap.values()),
    evidenceMap,
    confidenceLabel: meshConfidence.label,
    uncertaintyLevel: meshConfidence.uncertaintyLevel,
    evidenceFound: evidenceFound(ranked),
    missingEvidence: meshConfidence.missingEvidence.length > 0 ? meshConfidence.missingEvidence : defaultMissing(understanding, ranked),
    suggestedSearches: followups.searches,
    suggestedBetterInputs: followups.betterInputs,
    optionalIntegrations: optionalIntegrationStatus(),
    social,
  };

  const value = {
    report,
    evidence: ranked,
    searchVariantsUsed: variantsUsed,
    coverage,
    category: understanding.categories[0] ?? "general",
    coverageLevel,
  };
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

async function buildSocialBlock(input: string, claimText: string): Promise<NonNullable<SourceMeshReport["social"]>> {
  const metadata = await extractSocialMetadata(input);
  const sourceQuality = scoreSocialSource(metadata, claimText);
  return {
    metadata,
    sourceQuality,
    claimEvidenceNote: "Social metadata describes the post source only. The claim still needs independent evidence from fact-check, news, official, legal, or research sources.",
  };
}

function mergeStatus(a: SourceMeshSourceChecked["status"] | undefined, b: SourceMeshSourceChecked["status"]): SourceMeshSourceChecked["status"] {
  if (!a) return b;
  if (a === "ok" || b === "ok") return "ok";
  if (a === "rate-limited" || b === "rate-limited") return "rate-limited";
  if (a === "error" || b === "error") return "error";
  return a;
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const byKey = new Map<string, EvidenceItem>();
  for (const item of items) {
    const key = normalizeKey(item.url || item.title);
    const prev = byKey.get(key);
    if (!prev || scoreEvidenceForDedupe(item) > scoreEvidenceForDedupe(prev)) byKey.set(key, item);
  }
  return Array.from(byKey.values());
}

function normalizeKey(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }
}

function scoreEvidenceForDedupe(item: EvidenceItem): number {
  return (item.domainScore ?? 0) + (item.relevance === "high" ? 20 : item.relevance === "medium" ? 10 : 0);
}

function verdictFromEvidence(evidence: EvidenceItem[]): CheckResult["evidenceVerdict"] {
  if (evidence.length === 0) return "none";
  const factChecks = evidence.filter((e) => e.source === "Fact Check");
  const supports = factChecks.filter((e) => e.evidenceType === "supports").length;
  const disputes = factChecks.filter((e) => e.evidenceType === "disputes").length;
  if (supports > 0 && disputes > 0) return "mixed";
  if (supports > 0) return "supports";
  if (disputes > 0) return "disputes";
  return "related-only";
}

function confidenceFromEvidence(evidence: EvidenceItem[], coverageLevel: CheckResult["coverageLevel"]): CheckResult["confidence"] {
  const score = Math.min(100, evidence.length * 10 + (coverageLevel === "high" ? 30 : coverageLevel === "medium" ? 15 : 0));
  return {
    level: score >= 70 ? "high" : score >= 45 ? "medium" : score > 0 ? "low" : "insufficient",
    score,
    rationale: evidence.length === 0 ? "No public evidence was returned by the routed sources." : `${evidence.length} public evidence item(s) returned with ${coverageLevel} source coverage.`,
    factors: [],
  };
}

function evidenceFound(evidence: EvidenceItem[]): string[] {
  if (evidence.length === 0) return ["No strong public evidence found in the sources checked."];
  return evidence.slice(0, 5).map((e) => `${e.publisher}: ${e.title}`);
}

function defaultMissing(understanding: ReturnType<typeof understandQuery>, evidence: EvidenceItem[]): string[] {
  const missing = ["A primary source matching the exact claim wording."];
  if (evidence.length === 0) missing.push("Any corroborating public source result from the routed adapters.");
  if (understanding.isVague) missing.push("Specific names, dates, places, and exact wording.");
  return missing;
}
