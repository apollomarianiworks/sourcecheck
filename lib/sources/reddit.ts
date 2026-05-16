import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId } from "./types";

const ENDPOINT = "https://www.reddit.com/search.json";

/**
 * Reddit public JSON search.
 *
 * Reddit's anonymous JSON endpoint is unstable — they often return 403/429
 * to unauthenticated bot user agents. This adapter is best-effort: it
 * tries the endpoint and gracefully reports "blocked" if Reddit refuses.
 *
 * We never use OAuth here. If REDDIT_DISABLE=1 is set, the adapter skips
 * itself entirely.
 */
export const redditAdapter: SourceAdapter = {
  id: "reddit",
  name: "Reddit",
  categories: ["celebrity-viral"],
  requiresKey: false,
  available: () => process.env.REDDIT_DISABLE !== "1",
  async search(query, opts) {
    const start = Date.now();
    if (process.env.REDDIT_DISABLE === "1") {
      return done("skipped", start, [], "Reddit adapter disabled via REDDIT_DISABLE=1");
    }
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&limit=${max}&type=link&sort=relevance&restrict_sr=0`;

    try {
      const res = await fetch(url, {
        headers: {
          // Reddit's docs strongly recommend a descriptive UA. Even so the
          // anonymous endpoint often refuses.
          "User-Agent": "ProofbaseBot/1.0 (public source verification; +https://example.invalid)",
          "Accept": "application/json",
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Reddit rate limit reached");
      if (res.status === 403 || res.status === 401) {
        return done("blocked", start, [], "Reddit refused the anonymous request. This is normal — Reddit blocks most public bots.");
      }
      if (!res.ok) return done("error", start, [], `Reddit returned ${res.status}`);

      const data = await res.json();
      const children: RedditChild[] = data?.data?.children ?? [];
      const items = children.map((c) => mapPost(c.data, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface RedditChild { data?: RedditPost; }
interface RedditPost {
  title?: string;
  subreddit?: string;
  permalink?: string;
  url?: string;
  url_overridden_by_dest?: string;
  created_utc?: number;
  num_comments?: number;
  ups?: number;
  selftext?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "reddit", name: "Reddit", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: redditAdapter.categories, requiresKey: false };
}

function mapPost(p: RedditPost | undefined, query: string): NormalizedEvidence | null {
  if (!p?.title || !p.permalink) return null;
  const discussion = `https://www.reddit.com${p.permalink}`;
  const submitted = p.url_overridden_by_dest && /^https?:\/\//.test(p.url_overridden_by_dest) ? p.url_overridden_by_dest : null;
  const primary = discussion; // always link to the discussion, not the unsafe externally-submitted URL
  const sub = p.subreddit ? `r/${p.subreddit}` : "Reddit";
  const date = typeof p.created_utc === "number" ? new Date(p.created_utc * 1000).toISOString() : null;
  const queryTokens = q(query);
  const matched = queryTokens.filter((t) => p.title!.toLowerCase().includes(t));
  const confidence = Math.min(1, 0.15 + matched.length * 0.1);

  const snippet = p.selftext
    ? clean(p.selftext).slice(0, 280) + (p.selftext.length > 280 ? "…" : "")
    : `${sub} discussion · ${p.ups ?? 0} ups · ${p.num_comments ?? 0} comments${submitted ? ` · links to ${hostOnly(submitted)}` : ""}.`;

  return {
    id: evidenceId("reddit", primary),
    title: p.title.slice(0, 220),
    sourceName: `Reddit — ${sub}`,
    sourceDomain: "reddit.com",
    url: primary,
    publishedAt: date,
    snippet,
    evidenceType: "related",
    sourceCategory: "social-media",
    confidence,
    rawProvider: "reddit",
    matchedTerms: matched,
    limitations: [
      "User-generated forum — no editorial oversight. Treat as anecdote, not evidence.",
    ],
  };
}

function hostOnly(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function clean(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
