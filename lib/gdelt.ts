import type { EvidenceItem } from "./types";
import { scoreDomain } from "./domain-scorer";

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  sourcecountry?: string;
  language?: string;
  socialimage?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

export async function searchGdelt(query: string): Promise<EvidenceItem[]> {
  const encoded = encodeURIComponent(query.trim());
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encoded}` +
    `&mode=artlist&maxrecords=10&timespan=MONTH&sort=hybridrel&format=json`;

  const res = await fetch(url, {
    headers: { "User-Agent": "FactCheckerApp/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 429) {
    const err = new Error("GDELT rate limit reached. Wait a minute and retry.");
    (err as Error & { rateLimited?: boolean }).rateLimited = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`GDELT returned ${res.status}`);
  }

  const data: GdeltResponse = await res.json();

  if (!data.articles || data.articles.length === 0) {
    return [];
  }

  return data.articles.map((article): EvidenceItem => {
    const domainScore = scoreDomain(article.domain);
    const dateStr = formatGdeltDate(article.seendate);
    const meta: string[] = [];
    if (article.sourcecountry) meta.push(article.sourcecountry);
    if (article.language && article.language !== "English") meta.push(article.language);

    return {
      source: "GDELT",
      evidenceType: "related",
      title: article.title || "(no title)",
      publisher: domainScore?.label && domainScore.tier !== "?" ? `${domainScore.label} (${article.domain})` : article.domain,
      url: article.url,
      snippet: `News coverage from ${article.domain}${meta.length ? ` — ${meta.join(", ")}` : ""}.`,
      domain: article.domain,
      domainScore: domainScore?.finalScore ?? null,
      domainLabel: domainScore?.label ?? null,
      domainTier: domainScore?.tier ?? null,
      date: dateStr,
      relevance: scoreRelevance(article.title, query),
      rating: null,
    };
  });
}

function formatGdeltDate(raw: string): string {
  if (!raw || raw.length < 8) return raw;
  try {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  } catch {
    return raw;
  }
}

function scoreRelevance(title: string, query: string): "high" | "medium" | "low" {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const titleLower = title.toLowerCase();
  const matches = queryWords.filter((w) => titleLower.includes(w)).length;
  const ratio = queryWords.length > 0 ? matches / queryWords.length : 0;
  if (ratio >= 0.6) return "high";
  if (ratio >= 0.3) return "medium";
  return "low";
}
