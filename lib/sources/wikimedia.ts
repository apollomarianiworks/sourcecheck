import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId } from "./types";
import { searchWikipedia as legacyWiki } from "@/lib/wikimedia";

export const wikimediaAdapter: SourceAdapter = {
  id: "wikimedia",
  name: "Wikipedia",
  categories: ["general", "politics-news", "science-research", "celebrity-viral"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    try {
      const items = await legacyWiki(query);
      const max = Math.min(opts?.maxResults ?? 3, 5);
      const queryTokens = q(query);
      const normalized: NormalizedEvidence[] = items.slice(0, max).map((it) => {
        const titleLow = it.title.toLowerCase();
        const matched = queryTokens.filter((t) => titleLow.includes(t));
        const confidence = it.relevance === "high" ? 0.7 : it.relevance === "medium" ? 0.45 : 0.2;
        return {
          id: evidenceId("wikimedia", it.url),
          title: it.title,
          sourceName: it.publisher,
          sourceDomain: it.domain,
          url: it.url,
          publishedAt: it.date ? new Date(it.date + "T00:00:00Z").toISOString() : null,
          snippet: it.snippet,
          evidenceType: "related",
          sourceCategory: "encyclopedia",
          confidence,
          rawProvider: "wikimedia",
          matchedTerms: matched,
          limitations: ["Encyclopedia context only — community-edited; verify any cited primary source."],
        };
      });
      return { adapter: "wikimedia", name: "Wikipedia", status: "ok", items: normalized, durationMs: Date.now() - start, categories: wikimediaAdapter.categories, requiresKey: false };
    } catch (e) {
      const r = e as Error & { rateLimited?: boolean };
      const status: AdapterResult["status"] = r?.rateLimited ? "rate-limited" : "error";
      return { adapter: "wikimedia", name: "Wikipedia", status, items: [], errorMessage: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start, categories: wikimediaAdapter.categories, requiresKey: false };
    }
  },
};

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
