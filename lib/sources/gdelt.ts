import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";
import { searchGdelt as legacyGdelt } from "@/lib/gdelt";

/**
 * Wraps the existing GDELT adapter to emit the NormalizedEvidence shape so it
 * can participate in the new source registry alongside arXiv, PubMed, etc.
 */
export const gdeltAdapter: SourceAdapter = {
  id: "gdelt",
  name: "GDELT 2.0",
  categories: ["general", "politics-news", "celebrity-viral", "health-medical", "science-research", "finance-business", "technology", "legal-court"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    try {
      const items = await legacyGdelt(query);
      const max = Math.min(opts?.maxResults ?? 10, 20);
      const queryTokens = q(query);
      const normalized: NormalizedEvidence[] = items.slice(0, max).map((it) => {
        const titleLow = it.title.toLowerCase();
        const matched = queryTokens.filter((t) => titleLow.includes(t));
        const confidence = it.relevance === "high" ? 0.85 : it.relevance === "medium" ? 0.5 : 0.2;
        return {
          id: evidenceId("gdelt", it.url),
          title: it.title,
          sourceName: it.publisher,
          sourceDomain: hostOf(it.url) || it.domain,
          url: it.url,
          publishedAt: it.date ? new Date(it.date + "T00:00:00Z").toISOString() : null,
          snippet: it.snippet,
          evidenceType: "related",
          sourceCategory: "mainstream-news",
          confidence,
          rawProvider: "gdelt",
          matchedTerms: matched,
          limitations: ["News index, last ~30 days only. GDELT does not assert stance."],
        };
      });
      return { adapter: "gdelt", name: "GDELT 2.0", status: "ok", items: normalized, durationMs: Date.now() - start, categories: gdeltAdapter.categories, requiresKey: false };
    } catch (e) {
      const r = e as Error & { rateLimited?: boolean };
      const status: AdapterResult["status"] = r?.rateLimited ? "rate-limited" : "error";
      return { adapter: "gdelt", name: "GDELT 2.0", status, items: [], errorMessage: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start, categories: gdeltAdapter.categories, requiresKey: false };
    }
  },
};

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
