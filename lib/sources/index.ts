import type { SourceAdapter, AdapterResult, ClaimCategory } from "./types";

import { gdeltAdapter } from "./gdelt";
import { wikimediaAdapter } from "./wikimedia";
import { googleFactCheckAdapter } from "./googleFactCheck";
import { arxivAdapter } from "./arxiv";
import { crossrefAdapter } from "./crossref";
import { pubmedAdapter } from "./pubmed";
import { openalexAdapter } from "./openalex";
import { courtlistenerAdapter } from "./courtlistener";
import { hackernewsAdapter } from "./hackernews";
import { redditAdapter } from "./reddit";
import { rssAdapter } from "./rss";

import { detectCategory, adaptersForClaim } from "./router";
import type { NormalizedEvidence } from "./types";

export const SOURCE_ADAPTERS: Record<string, SourceAdapter> = {
  googleFactCheck: googleFactCheckAdapter,
  gdelt:           gdeltAdapter,
  wikimedia:       wikimediaAdapter,
  arxiv:           arxivAdapter,
  crossref:        crossrefAdapter,
  pubmed:          pubmedAdapter,
  openalex:        openalexAdapter,
  courtlistener:   courtlistenerAdapter,
  hackernews:      hackernewsAdapter,
  reddit:          redditAdapter,
  rss:             rssAdapter,
};

export const ALL_ADAPTER_IDS = Object.keys(SOURCE_ADAPTERS);

export interface MultiSearchOptions {
  /** Per-adapter timeout. Overall scan time is bounded by Promise.allSettled. */
  timeoutMs?: number;
  /** Max results requested per adapter. */
  maxResultsPerAdapter?: number;
  /** Adapter ids to exclude. */
  exclude?: string[];
  /** Adapter ids to force in (still must be available). */
  forceInclude?: string[];
  /** Already-known claim categories; if omitted, we detect from the query. */
  claimCategories?: ClaimCategory[];
}

export interface MultiSearchOutput {
  query: string;
  primaryCategory: ClaimCategory;
  categories: ClaimCategory[];
  adaptersTried: string[];
  results: AdapterResult[];
  evidence: NormalizedEvidence[];
  coverage: "low" | "medium" | "high";
}

/**
 * Run the relevant adapters in parallel, return per-adapter status + merged
 * (deduplicated) evidence. Never throws.
 */
export async function multiSearch(
  query: string,
  opts: MultiSearchOptions = {}
): Promise<MultiSearchOutput> {
  const detected = opts.claimCategories
    ? { primary: opts.claimCategories[0], all: opts.claimCategories, details: [] }
    : detectCategory(query);

  const wantedIds = adaptersForClaim(detected.all);
  const finalIds = Array.from(new Set([...wantedIds, ...(opts.forceInclude ?? [])]))
    .filter((id) => !(opts.exclude ?? []).includes(id))
    .filter((id) => SOURCE_ADAPTERS[id]);

  const adaptersToRun = finalIds.map((id) => SOURCE_ADAPTERS[id]);

  const settled = await Promise.allSettled(
    adaptersToRun.map(async (a) => {
      if (!a.available()) {
        return {
          adapter: a.id,
          name: a.name,
          status: a.requiresKey ? ("no-key" as const) : ("skipped" as const),
          items: [],
          durationMs: 0,
          categories: a.categories,
          requiresKey: a.requiresKey,
        };
      }
      return a.search(query, {
        timeoutMs: opts.timeoutMs ?? 10_000,
        maxResults: opts.maxResultsPerAdapter ?? 6,
        // Pass categories to adapters that care (e.g. RSS)
        ...({ claimCategories: detected.all } as object),
      });
    })
  );

  const results: AdapterResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const a = adaptersToRun[i];
    return {
      adapter: a.id,
      name: a.name,
      status: "error" as const,
      items: [],
      errorMessage: String(s.reason),
      durationMs: 0,
      categories: a.categories,
      requiresKey: a.requiresKey,
    };
  });

  // Dedup by URL across all adapters. Keep the highest-confidence copy.
  const byUrl = new Map<string, NormalizedEvidence>();
  for (const r of results) {
    for (const it of r.items) {
      const key = normalizeUrlKey(it.url);
      const prev = byUrl.get(key);
      if (!prev || it.confidence > prev.confidence) {
        byUrl.set(key, it);
      }
    }
  }
  const merged: NormalizedEvidence[] = Array.from(byUrl.values());

  const okCount = results.filter((r) => r.status === "ok" && r.items.length > 0).length;
  const coverage: MultiSearchOutput["coverage"] =
    okCount >= 5 ? "high" : okCount >= 2 ? "medium" : "low";

  return {
    query,
    primaryCategory: detected.primary,
    categories: detected.all,
    adaptersTried: finalIds,
    results,
    evidence: merged,
    coverage,
  };
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export { detectCategory, adaptersForClaim };
export type { ClaimCategory } from "./types";
