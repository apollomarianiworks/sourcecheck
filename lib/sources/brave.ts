import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";
import { inferCategory } from "@/lib/categories";

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export const braveAdapter: SourceAdapter = {
  id: "brave",
  name: "Brave Search",
  categories: ["general", "politics-news", "health-medical", "science-research", "legal-court", "finance-business", "technology", "celebrity-viral"],
  requiresKey: true,
  available: () => !!process.env.BRAVE_SEARCH_API_KEY,
  async search(query, opts) {
    const start = Date.now();
    if (!process.env.BRAVE_SEARCH_API_KEY) return done("no-key", start, [], "BRAVE_SEARCH_API_KEY not set");
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const params = new URLSearchParams({ q: query, count: String(max), safesearch: "moderate", text_decorations: "false" });
    try {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
          "User-Agent": "ProofbaseBot/1.0 public evidence research",
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Brave Search rate limit reached");
      if (!res.ok) return done("error", start, [], `Brave Search returned ${res.status}`);
      const data = await res.json();
      const items = ((data?.web?.results ?? []) as BraveResult[]).map((item) => mapResult(item, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface BraveResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: braveAdapter.id, name: braveAdapter.name, status, items, errorMessage: msg, durationMs: Date.now() - start, categories: braveAdapter.categories, requiresKey: true };
}

function mapResult(result: BraveResult, query: string): NormalizedEvidence | null {
  if (!result.title || !result.url) return null;
  const domain = hostOf(result.url);
  const text = `${result.title} ${result.description ?? ""}`.toLowerCase();
  const matched = q(query).filter((token) => text.includes(token));
  return {
    id: evidenceId("brave", result.url),
    title: result.title.slice(0, 220),
    sourceName: `Brave Search - ${domain || "web result"}`,
    sourceDomain: domain,
    url: result.url,
    publishedAt: null,
    snippet: result.description ?? "Web search result.",
    evidenceType: "related",
    sourceCategory: inferCategory(domain),
    confidence: Math.min(1, 0.2 + matched.length * 0.12),
    rawProvider: "brave",
    matchedTerms: matched,
    limitations: ["Search result snippet only. Open the linked source before treating it as evidence."],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
