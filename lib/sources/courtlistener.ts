import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId } from "./types";

const ENDPOINT = "https://www.courtlistener.com/api/rest/v4/search/";

/**
 * CourtListener — Free Law Project search. Basic search works without a key.
 * Optional COURTLISTENER_API_KEY lifts rate limits.
 */
export const courtlistenerAdapter: SourceAdapter = {
  id: "courtlistener",
  name: "CourtListener",
  categories: ["legal-court"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&type=o&order_by=score%20desc&format=json`;
    const apiKey = process.env.COURTLISTENER_API_KEY;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SourceCheckBot/1.0 (public source verification)",
          "Accept": "application/json",
          ...(apiKey ? { Authorization: `Token ${apiKey}` } : {}),
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "CourtListener rate limit reached");
      if (res.status === 403) return done("blocked",      start, [], "CourtListener blocked the request (try adding COURTLISTENER_API_KEY)");
      if (!res.ok)             return done("error",       start, [], `CourtListener returned ${res.status}`);

      const data = await res.json();
      const results: CourtListenerResult[] = data?.results ?? [];
      const items = results.slice(0, max).map((r) => mapResult(r, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface CourtListenerResult {
  caseName?: string;
  caseNameShort?: string;
  court?: string;
  dateFiled?: string;
  absolute_url?: string;
  citation?: { citation?: string }[] | string[];
  snippet?: string;
  text?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "courtlistener", name: "CourtListener", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: courtlistenerAdapter.categories, requiresKey: false };
}

function mapResult(r: CourtListenerResult, query: string): NormalizedEvidence | null {
  const title = (r.caseName ?? r.caseNameShort ?? "").trim();
  if (!title || !r.absolute_url) return null;
  const url = r.absolute_url.startsWith("http") ? r.absolute_url : `https://www.courtlistener.com${r.absolute_url}`;
  const court = r.court ?? "Court";
  const date = r.dateFiled ? new Date(r.dateFiled + "T00:00:00Z").toISOString() : null;
  const citations = Array.isArray(r.citation)
    ? r.citation.map((c) => (typeof c === "string" ? c : c?.citation)).filter(Boolean).join("; ")
    : "";
  const queryTokens = q(query);
  const titleLow = title.toLowerCase();
  const matched = queryTokens.filter((t) => titleLow.includes(t));
  const confidence = Math.min(1, 0.3 + matched.length * 0.15);

  const rawSnippet = (r.snippet ?? r.text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const snippet = rawSnippet
    ? rawSnippet.slice(0, 320) + (rawSnippet.length > 320 ? "…" : "")
    : `Court of record: ${court}.${citations ? " " + citations : ""}`;

  return {
    id: evidenceId("courtlistener", url),
    title: title.slice(0, 220),
    sourceName: `CourtListener — ${court}`,
    sourceDomain: "courtlistener.com",
    url,
    publishedAt: date,
    snippet,
    evidenceType: "related",
    sourceCategory: "court-legal",
    confidence,
    rawProvider: "courtlistener",
    matchedTerms: matched,
    limitations: ["Federal/state opinion archive — does not summarise legal outcomes; read the opinion itself."],
  };
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
