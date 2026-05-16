import type { SourceAdapter, AdapterResult, NormalizedEvidence, ClaimCategory } from "./types";
import { evidenceId } from "./types";
import feedsData from "@/data/rss-sources.json";
import type { SourceCategory } from "@/lib/categories";

interface FeedConfig {
  id: string;
  name: string;
  url: string;
  publisher: string;
  category: SourceCategory;
  claimCategories: ClaimCategory[];
  limitations: string;
}

const FEEDS: FeedConfig[] = (feedsData as { feeds: FeedConfig[] }).feeds;
const TTL_MS = 10 * 60 * 1000; // 10-minute in-memory cache

interface CachedFeed {
  items: ParsedItem[];
  fetchedAt: number;
  errorMessage?: string;
}

interface ParsedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}

const cache = new Map<string, CachedFeed>();

/**
 * RSS adapter — pulls from a CURATED list of reputable feeds only.
 * Never accepts user-supplied feed URLs.
 *
 * Items from non-fact-checker feeds are always tagged "related" — we do
 * NOT pretend headlines are verdicts. Fact-checker feeds (snopes / politifact /
 * factcheck.org) get the "Fact Check" source label downstream but still flow
 * as "related" stance unless the title clearly indicates a rating verb.
 */
export const rssAdapter: SourceAdapter = {
  id: "rss",
  name: "RSS feeds",
  categories: ["general", "politics-news", "health-medical", "science-research", "finance-business"],
  requiresKey: false,
  available: () => FEEDS.length > 0,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 6, 12);

    const requestedCats: ClaimCategory[] = (opts as { claimCategories?: ClaimCategory[] })?.claimCategories ?? [];
    const activeFeeds = requestedCats.length === 0
      ? FEEDS
      : FEEDS.filter((f) => f.claimCategories.some((c) => requestedCats.includes(c)) || f.claimCategories.includes("general"));

    const queryTokens = q(query);
    const lowerQuery = query.toLowerCase();

    // Fetch in parallel with per-feed timeouts; cache per feed for TTL_MS.
    const fetched = await Promise.allSettled(
      activeFeeds.map((feed) => loadFeed(feed, opts?.timeoutMs ?? 8_000))
    );

    const allItems: NormalizedEvidence[] = [];
    let anyError = false;

    for (let i = 0; i < activeFeeds.length; i++) {
      const feed = activeFeeds[i];
      const result = fetched[i];
      if (result.status === "rejected") { anyError = true; continue; }
      const cached = result.value;
      if (cached.errorMessage) anyError = true;

      // Filter feed items against the query (cheap relevance pass)
      const matches = cached.items
        .map((it) => scoreItem(it, lowerQuery, queryTokens))
        .filter((m) => m.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance);

      for (const m of matches.slice(0, 3)) {
        allItems.push(toEvidence(m.item, feed, m.matchedTerms, m.relevance));
        if (allItems.length >= max) break;
      }
      if (allItems.length >= max) break;
    }

    return {
      adapter: "rss",
      name: "RSS feeds",
      status: anyError && allItems.length === 0 ? "error" : "ok",
      items: allItems.slice(0, max),
      errorMessage: anyError && allItems.length === 0 ? "One or more feeds failed to load." : undefined,
      durationMs: Date.now() - start,
      categories: rssAdapter.categories,
      requiresKey: false,
    };
  },
};

async function loadFeed(feed: FeedConfig, timeoutMs: number): Promise<CachedFeed> {
  const now = Date.now();
  const cached = cache.get(feed.id);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached;

  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "SourceCheckBot/1.0 (public source verification)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.5",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const failed: CachedFeed = { items: cached?.items ?? [], fetchedAt: now, errorMessage: `${feed.id}: HTTP ${res.status}` };
      cache.set(feed.id, failed);
      return failed;
    }
    const xml = await res.text();
    const items = parseFeed(xml);
    const fresh: CachedFeed = { items, fetchedAt: now };
    cache.set(feed.id, fresh);
    return fresh;
  } catch (e) {
    const failed: CachedFeed = { items: cached?.items ?? [], fetchedAt: now, errorMessage: `${feed.id}: ${e instanceof Error ? e.message : String(e)}` };
    cache.set(feed.id, failed);
    return failed;
  }
}

function parseFeed(xml: string): ParsedItem[] {
  const out: ParsedItem[] = [];

  // RSS 2.0
  const rssItems = xml.split(/<item[\s>]/i).slice(1);
  for (const block of rssItems) {
    const title = decode(stripTags(extract(block, "title")));
    const link = decode(stripTags(extract(block, "link") || extractAttr(block, "link", "href") || ""));
    const desc = decode(stripTags(extract(block, "description") || extract(block, "content:encoded") || ""));
    const pub = extract(block, "pubDate") || extract(block, "dc:date") || null;
    if (title && link) out.push({ title, link, description: desc, pubDate: pub });
  }

  // Atom
  if (out.length === 0) {
    const atomEntries = xml.split(/<entry[\s>]/i).slice(1);
    for (const block of atomEntries) {
      const title = decode(stripTags(extract(block, "title")));
      const link = extractAttr(block, "link", "href");
      const summary = decode(stripTags(extract(block, "summary") || extract(block, "content") || ""));
      const pub = extract(block, "updated") || extract(block, "published") || null;
      if (title && link) out.push({ title, link, description: summary, pubDate: pub });
    }
  }

  return out.slice(0, 50);
}

function extract(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function extractAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function stripTags(s: string): string {
  // Trim CDATA wrappers first
  const cdata = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) return cdata[1].trim();
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

interface ScoredItem {
  item: ParsedItem;
  relevance: number;
  matchedTerms: string[];
}

function scoreItem(it: ParsedItem, lowerQuery: string, tokens_: string[]): ScoredItem {
  const titleLow = it.title.toLowerCase();
  const descLow = it.description.toLowerCase();

  // Exact phrase match → strong score
  if (lowerQuery.length >= 6 && titleLow.includes(lowerQuery)) {
    return { item: it, relevance: 1, matchedTerms: [lowerQuery] };
  }
  const matched = tokens_.filter((t) => titleLow.includes(t) || descLow.includes(t));
  if (matched.length === 0) return { item: it, relevance: 0, matchedTerms: [] };
  const rel = Math.min(1, matched.length / Math.max(2, tokens_.length));
  return { item: it, relevance: rel, matchedTerms: matched };
}

function toEvidence(it: ParsedItem, feed: FeedConfig, matched: string[], relevance: number): NormalizedEvidence {
  const isFactChecker = feed.category === "fact-checker";
  let publishedAt: string | null = null;
  if (it.pubDate) {
    const t = Date.parse(it.pubDate);
    if (!Number.isNaN(t)) publishedAt = new Date(t).toISOString();
  }
  const snippet = it.description
    ? it.description.slice(0, 320) + (it.description.length > 320 ? "…" : "")
    : `From the ${feed.name} feed.`;

  return {
    id: evidenceId("rss-" + feed.id, it.link),
    title: it.title.slice(0, 220),
    sourceName: feed.name,
    sourceDomain: feed.publisher,
    url: it.link,
    publishedAt,
    snippet,
    // RSS feeds NEVER assert stance — always "related". Fact-checker feeds
    // can be re-stanced later by the fact-check reconciliation logic if
    // their items also appear in the Google Fact Check Tools API.
    evidenceType: "related",
    sourceCategory: feed.category,
    confidence: relevance,
    rawProvider: "rss",
    matchedTerms: matched,
    limitations: [
      isFactChecker
        ? "Headline only — open the source for the full fact-check verdict."
        : `Headline aggregation — does not constitute a fact-check.`,
      feed.limitations,
    ],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
