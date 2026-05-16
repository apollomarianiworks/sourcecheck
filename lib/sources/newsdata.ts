import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";
import { inferCategory } from "@/lib/categories";

const ENDPOINT = "https://newsdata.io/api/1/news";

export const newsDataAdapter: SourceAdapter = {
  id: "newsdata",
  name: "NewsData.io",
  categories: ["general", "politics-news", "health-medical", "finance-business", "technology", "celebrity-viral"],
  requiresKey: true,
  available: () => !!process.env.NEWSDATA_API_KEY,
  async search(query, opts) {
    const start = Date.now();
    if (!process.env.NEWSDATA_API_KEY) return done("no-key", start, [], "NEWSDATA_API_KEY not set");
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const params = new URLSearchParams({ apikey: process.env.NEWSDATA_API_KEY, q: query, language: "en", size: String(max) });
    try {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json", "User-Agent": "ProofbaseBot/1.0 public evidence research" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "NewsData.io rate limit reached");
      if (!res.ok) return done("error", start, [], `NewsData.io returned ${res.status}`);
      const data = await res.json();
      const items = ((data?.results ?? []) as NewsDataResult[]).map((item) => mapResult(item, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface NewsDataResult {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: newsDataAdapter.id, name: newsDataAdapter.name, status, items, errorMessage: msg, durationMs: Date.now() - start, categories: newsDataAdapter.categories, requiresKey: true };
}

function mapResult(result: NewsDataResult, query: string): NormalizedEvidence | null {
  if (!result.title || !result.link) return null;
  const domain = hostOf(result.link);
  const matched = q(query).filter((token) => `${result.title} ${result.description ?? ""}`.toLowerCase().includes(token));
  return {
    id: evidenceId("newsdata", result.link),
    title: result.title.slice(0, 220),
    sourceName: result.source_name ?? result.source_id ?? "NewsData.io",
    sourceDomain: domain || result.source_id || "newsdata.io",
    url: result.link,
    publishedAt: result.pubDate ? new Date(result.pubDate).toISOString() : null,
    snippet: result.description ?? "NewsData.io article result.",
    evidenceType: "related",
    sourceCategory: inferCategory(domain),
    confidence: Math.min(1, 0.25 + matched.length * 0.12),
    rawProvider: "newsdata",
    matchedTerms: matched,
    limitations: ["Optional news API result. News coverage is context, not a truth verdict."],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
