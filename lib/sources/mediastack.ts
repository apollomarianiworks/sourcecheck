import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";
import { inferCategory } from "@/lib/categories";

const ENDPOINT = "http://api.mediastack.com/v1/news";

export const mediastackAdapter: SourceAdapter = {
  id: "mediastack",
  name: "Mediastack",
  categories: ["general", "politics-news", "finance-business", "technology", "celebrity-viral"],
  requiresKey: true,
  available: () => !!process.env.MEDIASTACK_API_KEY,
  async search(query, opts) {
    const start = Date.now();
    if (!process.env.MEDIASTACK_API_KEY) return done("no-key", start, [], "MEDIASTACK_API_KEY not set");
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const params = new URLSearchParams({ access_key: process.env.MEDIASTACK_API_KEY, keywords: query, languages: "en", limit: String(max), sort: "published_desc" });
    try {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json", "User-Agent": "ProofbaseBot/1.0 public evidence research" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Mediastack rate limit reached");
      if (!res.ok) return done("error", start, [], `Mediastack returned ${res.status}`);
      const json = await res.json();
      if (json?.error) return done("error", start, [], json.error.message ?? "Mediastack error");
      const items = ((json?.data ?? []) as MediastackArticle[]).map((item) => mapArticle(item, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface MediastackArticle {
  title?: string;
  url?: string;
  description?: string;
  source?: string;
  published_at?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: mediastackAdapter.id, name: mediastackAdapter.name, status, items, errorMessage: msg, durationMs: Date.now() - start, categories: mediastackAdapter.categories, requiresKey: true };
}

function mapArticle(article: MediastackArticle, query: string): NormalizedEvidence | null {
  if (!article.title || !article.url) return null;
  const domain = hostOf(article.url);
  const matched = q(query).filter((token) => `${article.title} ${article.description ?? ""}`.toLowerCase().includes(token));
  return {
    id: evidenceId("mediastack", article.url),
    title: article.title.slice(0, 220),
    sourceName: article.source ?? "Mediastack",
    sourceDomain: domain || article.source || "mediastack.com",
    url: article.url,
    publishedAt: article.published_at ?? null,
    snippet: article.description ?? "Mediastack article result.",
    evidenceType: "related",
    sourceCategory: inferCategory(domain),
    confidence: Math.min(1, 0.25 + matched.length * 0.12),
    rawProvider: "mediastack",
    matchedTerms: matched,
    limitations: ["Optional news API result. News coverage is context, not a truth verdict."],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
