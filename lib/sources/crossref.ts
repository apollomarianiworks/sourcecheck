import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";

const ENDPOINT = "https://api.crossref.org/works";

/**
 * Crossref — DOI metadata for academic publications. Free, polite-pool friendly
 * via mailto query param. No key required.
 */
export const crossrefAdapter: SourceAdapter = {
  id: "crossref",
  name: "Crossref",
  categories: ["science-research", "health-medical"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&rows=${max}&select=DOI,title,abstract,issued,container-title,author,publisher,URL`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "ProofbaseBot/1.0 (public source verification; mailto:proofbase@example.invalid)",
          "Accept": "application/json",
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Crossref rate limit reached");
      if (!res.ok)             return done("error", start, [], `Crossref returned ${res.status}`);

      const data = await res.json();
      const works = data?.message?.items ?? [];
      const items: NormalizedEvidence[] = works.map((w: CrossrefWork) => mapWork(w, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  abstract?: string;
  issued?: { "date-parts": number[][] };
  "container-title"?: string[];
  author?: { given?: string; family?: string }[];
  publisher?: string;
  URL?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "crossref", name: "Crossref", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: crossrefAdapter.categories, requiresKey: false };
}

function mapWork(w: CrossrefWork, query: string): NormalizedEvidence | null {
  if (!w.URL || !w.title || w.title.length === 0) return null;
  const title = (w.title[0] ?? "").trim();
  const url = w.URL;
  const journal = w["container-title"]?.[0] ?? w.publisher ?? "Crossref";
  const authors = (w.author ?? [])
    .map((a) => [a.given, a.family].filter(Boolean).join(" "))
    .filter((s) => s.length > 0);
  const date = w.issued?.["date-parts"]?.[0];
  let publishedAt: string | null = null;
  if (date && date.length >= 1) {
    const y = date[0], m = date[1] ?? 1, d = date[2] ?? 1;
    publishedAt = new Date(Date.UTC(y, m - 1, d)).toISOString();
  }

  const abstract = clean(w.abstract ?? "");
  const snippet = abstract
    ? abstract.slice(0, 320) + (abstract.length > 320 ? "…" : "")
    : `Published in ${journal}.${authors.length > 0 ? ` Authors: ${authors.slice(0, 3).join(", ")}${authors.length > 3 ? " et al." : ""}.` : ""}`;

  const queryTokens = q(query);
  const titleLow = title.toLowerCase();
  const matched = queryTokens.filter((t) => titleLow.includes(t) || abstract.toLowerCase().includes(t));
  const confidence = Math.min(1, 0.3 + matched.length * 0.15);

  return {
    id: evidenceId("crossref", url),
    title: title.slice(0, 220),
    sourceName: `Crossref — ${journal}`,
    sourceDomain: hostOf(url) || "doi.org",
    url,
    publishedAt,
    snippet,
    evidenceType: "related",
    sourceCategory: "academic",
    confidence,
    rawProvider: "crossref",
    matchedTerms: matched,
    limitations: ["DOI metadata only — does not indicate whether the work is peer-reviewed or retracted."],
  };
}

function clean(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
