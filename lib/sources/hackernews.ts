import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";

const ENDPOINT = "https://hn.algolia.com/api/v1/search";

/**
 * Hacker News Algolia API — discussion + story search. No key required.
 */
export const hackernewsAdapter: SourceAdapter = {
  id: "hackernews",
  name: "Hacker News",
  categories: ["technology"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${max}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ProofbaseBot/1.0 (public source verification)" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "HN Algolia rate limit reached");
      if (!res.ok)             return done("error",        start, [], `HN Algolia returned ${res.status}`);

      const data = await res.json();
      const hits: HNHit[] = data?.hits ?? [];
      const items = hits.map((h) => mapHit(h, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface HNHit {
  objectID?: string;
  title?: string;
  url?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
  story_text?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "hackernews", name: "Hacker News", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: hackernewsAdapter.categories, requiresKey: false };
}

function mapHit(h: HNHit, query: string): NormalizedEvidence | null {
  const title = (h.title ?? "").trim();
  if (!title || !h.objectID) return null;
  // Prefer the linked story URL if present; fall back to the HN discussion.
  const submittedUrl = h.url ?? null;
  const discussionUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
  const primaryUrl = submittedUrl || discussionUrl;

  const queryTokens = q(query);
  const matched = queryTokens.filter((t) => title.toLowerCase().includes(t));
  const confidence = Math.min(1, 0.25 + matched.length * 0.12);

  const points = h.points ?? 0;
  const comments = h.num_comments ?? 0;
  const date = h.created_at ?? null;
  const author = h.author ?? "anonymous";

  const meta = `${points} point${points === 1 ? "" : "s"} · ${comments} comment${comments === 1 ? "" : "s"} · by ${author}`;
  const snippet = h.story_text
    ? clean(h.story_text).slice(0, 280) + (h.story_text.length > 280 ? "…" : "")
    : submittedUrl
    ? `Submitted to Hacker News (${hostOf(submittedUrl)}). ${meta}.`
    : `Discussion on Hacker News. ${meta}.`;

  return {
    id: evidenceId("hackernews", primaryUrl),
    title: title.slice(0, 220),
    sourceName: submittedUrl ? `Hacker News — ${hostOf(submittedUrl)}` : "Hacker News",
    sourceDomain: submittedUrl ? hostOf(submittedUrl) : "news.ycombinator.com",
    url: primaryUrl,
    publishedAt: date,
    snippet,
    evidenceType: "related",
    sourceCategory: "blog",
    confidence,
    rawProvider: "hackernews",
    matchedTerms: matched,
    limitations: [
      "User-submitted aggregator. Discussion quality varies; popularity is not credibility.",
      "Discussion thread does not reflect the linked source's editorial standards.",
    ],
  };
}

function clean(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
