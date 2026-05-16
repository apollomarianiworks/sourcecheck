import type { EvidenceItem } from "./types";

interface WikiSearchResult {
  ns: number;
  title: string;
  pageid: number;
  snippet: string;
  timestamp?: string;
}

interface WikiSearchResponse {
  query?: {
    search?: WikiSearchResult[];
  };
}

interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  timestamp?: string;
  content_urls?: {
    desktop?: { page?: string };
  };
  thumbnail?: { source: string };
}

export async function searchWikipedia(query: string): Promise<EvidenceItem[]> {
  const encoded = encodeURIComponent(query.trim());
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}` +
    `&format=json&origin=*&utf8=1&srlimit=3&srprop=snippet|timestamp`;

  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "FactCheckerApp/1.0 (educational use)" },
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 429) {
    const err = new Error("Wikipedia rate limit reached. Wait a minute and retry.");
    (err as Error & { rateLimited?: boolean }).rateLimited = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Wikipedia search returned ${res.status}`);
  }

  const data: WikiSearchResponse = await res.json();
  const results = data.query?.search ?? [];

  if (results.length === 0) return [];

  const topTwo = results.slice(0, 2);
  const summaries = await Promise.allSettled(
    topTwo.map((r) => fetchWikiSummary(r.title))
  );

  const items: EvidenceItem[] = [];

  for (let i = 0; i < topTwo.length; i++) {
    const result = topTwo[i];
    const summaryResult = summaries[i];
    const summary =
      summaryResult.status === "fulfilled" ? summaryResult.value : null;

    const snippet = summary?.extract
      ? summary.extract.slice(0, 320).trim() + (summary.extract.length > 320 ? "…" : "")
      : stripHtml(result.snippet).slice(0, 320);

    const pageUrl =
      summary?.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`;

    const date = summary?.timestamp
      ? summary.timestamp.slice(0, 10)
      : result.timestamp
      ? result.timestamp.slice(0, 10)
      : null;

    items.push({
      source: "Wikipedia",
      evidenceType: "related",
      title: result.title,
      publisher: "Wikipedia (English)",
      url: pageUrl,
      snippet,
      domain: "en.wikipedia.org",
      domainScore: 72,
      domainLabel: "Community Encyclopedia",
      domainTier: "B",
      date,
      relevance: scoreRelevance(result.title, query),
      rating: null,
    });
  }

  return items;
}

async function fetchWikiSummary(title: string): Promise<WikiSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FactCheckerApp/1.0 (educational use)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Wiki summary ${res.status}`);
  return res.json();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function scoreRelevance(title: string, query: string): "high" | "medium" | "low" {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const titleLower = title.toLowerCase();
  const matches = queryWords.filter((w) => titleLower.includes(w)).length;
  const ratio = queryWords.length > 0 ? matches / queryWords.length : 0;
  if (ratio >= 0.5) return "high";
  if (ratio >= 0.25) return "medium";
  return "low";
}
