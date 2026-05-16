import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId } from "./types";

const SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

/**
 * PubMed E-utilities — biomedical literature.
 * No key required (3 req/sec without). With NCBI_API_KEY env var the limit
 * is higher; we'll use it transparently if present.
 */
export const pubmedAdapter: SourceAdapter = {
  id: "pubmed",
  name: "PubMed",
  categories: ["health-medical", "science-research"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const apiKey = process.env.NCBI_API_KEY ? `&api_key=${encodeURIComponent(process.env.NCBI_API_KEY)}` : "";

    const searchUrl = `${SEARCH}?db=pubmed&term=${encodeURIComponent(query)}&retmax=${max}&retmode=json&sort=relevance${apiKey}`;
    try {
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "SourceCheckBot/1.0 (public source verification)" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (searchRes.status === 429) return done("rate-limited", start, [], "PubMed rate limit reached");
      if (!searchRes.ok)             return done("error",        start, [], `PubMed esearch ${searchRes.status}`);

      const searchData = await searchRes.json();
      const ids: string[] = searchData?.esearchresult?.idlist ?? [];
      if (ids.length === 0) return done("ok", start, []);

      const summaryUrl = `${SUMMARY}?db=pubmed&id=${ids.join(",")}&retmode=json${apiKey}`;
      const sumRes = await fetch(summaryUrl, {
        headers: { "User-Agent": "SourceCheckBot/1.0 (public source verification)" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (!sumRes.ok) return done("error", start, [], `PubMed esummary ${sumRes.status}`);

      const sumData = await sumRes.json();
      const records: PubmedSummary[] = ids.map((id) => sumData?.result?.[id]).filter(Boolean);
      const items = records.map((r) => mapRecord(r, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface PubmedSummary {
  uid?: string;
  title?: string;
  pubdate?: string;
  source?: string;     // journal short name
  fulljournalname?: string;
  authors?: { name: string }[];
  pubtype?: string[];
  elocationid?: string;
  articleids?: { idtype: string; value: string }[];
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "pubmed", name: "PubMed", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: pubmedAdapter.categories, requiresKey: false };
}

function mapRecord(r: PubmedSummary, query: string): NormalizedEvidence | null {
  if (!r.uid || !r.title) return null;
  const url = `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`;
  const authors = (r.authors ?? []).slice(0, 3).map((a) => a.name).join(", ");
  const journal = r.fulljournalname ?? r.source ?? "PubMed";
  const date = parsePubmedDate(r.pubdate);
  const types = (r.pubtype ?? []).filter((t) => t).join(", ");
  const queryTokens = q(query);
  const matched = queryTokens.filter((t) => r.title!.toLowerCase().includes(t));
  const confidence = Math.min(1, 0.3 + matched.length * 0.15);

  return {
    id: evidenceId("pubmed", url),
    title: r.title.slice(0, 220),
    sourceName: `PubMed — ${journal}`,
    sourceDomain: "pubmed.ncbi.nlm.nih.gov",
    url,
    publishedAt: date,
    snippet:
      `${types ? types + ". " : ""}` +
      `${authors ? authors + (r.authors && r.authors.length > 3 ? " et al." : "") + ". " : ""}` +
      `Indexed by the US National Library of Medicine.`,
    evidenceType: "related",
    sourceCategory: "medical-science",
    confidence,
    rawProvider: "pubmed",
    matchedTerms: matched,
    limitations: ["Abstract metadata only — full text often paywalled. Indexing does not equal endorsement."],
  };
}

function parsePubmedDate(s?: string): string | null {
  if (!s) return null;
  // "2024 Mar 15" / "2024 Mar" / "2024"
  const m = s.match(/^(\d{4})(?:\s+(\w+))?(?:\s+(\d{1,2}))?$/);
  if (!m) return null;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const y = Number(m[1]);
  const mo = m[2] ? months[m[2].slice(0, 3) as keyof typeof months] ?? 0 : 0;
  const d = m[3] ? Number(m[3]) : 1;
  return new Date(Date.UTC(y, mo, d)).toISOString();
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
