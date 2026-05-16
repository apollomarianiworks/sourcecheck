import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";

const ENDPOINT = "https://api.semanticscholar.org/graph/v1/paper/search";

export const semanticScholarAdapter: SourceAdapter = {
  id: "semanticScholar",
  name: "Semantic Scholar",
  categories: ["science-research", "health-medical", "technology"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const params = new URLSearchParams({
      query,
      limit: String(max),
      fields: "title,abstract,year,publicationDate,url,venue,authors,citationCount,openAccessPdf,isOpenAccess,publicationTypes",
    });

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "ProofbaseBot/1.0 (public evidence research)",
      };
      if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers,
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Semantic Scholar rate limit reached");
      if (!res.ok) return done("error", start, [], `Semantic Scholar returned ${res.status}`);

      const data = await res.json();
      const papers: SemanticPaper[] = data?.data ?? [];
      const items = papers.map((paper) => mapPaper(paper, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface SemanticPaper {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  publicationDate?: string;
  url?: string;
  venue?: string;
  authors?: { name?: string }[];
  citationCount?: number;
  openAccessPdf?: { url?: string };
  isOpenAccess?: boolean;
  publicationTypes?: string[];
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return {
    adapter: semanticScholarAdapter.id,
    name: semanticScholarAdapter.name,
    status,
    items,
    errorMessage: msg,
    durationMs: Date.now() - start,
    categories: semanticScholarAdapter.categories,
    requiresKey: false,
  };
}

function mapPaper(paper: SemanticPaper, query: string): NormalizedEvidence | null {
  const title = paper.title?.trim();
  if (!title) return null;
  const url = paper.url || paper.openAccessPdf?.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : "");
  if (!url) return null;

  const abstract = paper.abstract?.replace(/\s+/g, " ").trim() ?? "";
  const tokens = q(query);
  const matched = tokens.filter((token) => `${title} ${abstract}`.toLowerCase().includes(token));
  const confidence = Math.min(1, 0.25 + matched.length * 0.14 + Math.min(0.2, (paper.citationCount ?? 0) / 500));
  const authors = (paper.authors ?? []).slice(0, 3).map((a) => a.name).filter(Boolean).join(", ");
  const date = paper.publicationDate
    ? new Date(`${paper.publicationDate}T00:00:00Z`).toISOString()
    : paper.year ? new Date(`${paper.year}-01-01T00:00:00Z`).toISOString() : null;

  return {
    id: evidenceId("semanticScholar", url),
    title: title.slice(0, 220),
    sourceName: `Semantic Scholar${paper.venue ? ` - ${paper.venue}` : ""}`,
    sourceDomain: hostOf(url) || "semanticscholar.org",
    url,
    publishedAt: date,
    snippet: abstract
      ? abstract.slice(0, 320) + (abstract.length > 320 ? "..." : "")
      : `${paper.venue ? `Venue: ${paper.venue}. ` : ""}${authors ? `Authors: ${authors}. ` : ""}${paper.citationCount ?? 0} citation(s).`,
    evidenceType: "related",
    sourceCategory: "academic",
    confidence,
    rawProvider: "semanticScholar",
    matchedTerms: matched,
    limitations: [
      "Academic search result. It can establish research context, not prove a user claim by itself.",
      paper.isOpenAccess ? "Open-access signal present." : "Full text may not be openly available.",
    ],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
