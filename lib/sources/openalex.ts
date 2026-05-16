import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";

const ENDPOINT = "https://api.openalex.org/works";

/**
 * OpenAlex — fully open academic graph (Crossref + many more sources).
 * No key required. Recommends `mailto=` in the user agent for the polite pool.
 */
export const openalexAdapter: SourceAdapter = {
  id: "openalex",
  name: "OpenAlex",
  categories: ["science-research", "health-medical"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const mailto = "proofbase@example.invalid";
    const url = `${ENDPOINT}?search=${encodeURIComponent(query)}&per-page=${max}&mailto=${encodeURIComponent(mailto)}&select=id,doi,display_name,publication_year,publication_date,primary_location,authorships,abstract_inverted_index,referenced_works_count,is_retracted,is_paratext,type`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": `ProofbaseBot/1.0 (public source verification; mailto:${mailto})`,
          "Accept": "application/json",
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "OpenAlex rate limit reached");
      if (!res.ok)             return done("error", start, [], `OpenAlex returned ${res.status}`);

      const data = await res.json();
      const results: OpenAlexWork[] = data?.results ?? [];
      const items = results.map((w) => mapWork(w, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface OpenAlexWork {
  id?: string;
  doi?: string;
  display_name?: string;
  publication_year?: number;
  publication_date?: string;
  primary_location?: { source?: { display_name?: string; host_organization_name?: string }; landing_page_url?: string };
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]>;
  referenced_works_count?: number;
  is_retracted?: boolean;
  is_paratext?: boolean;
  type?: string;
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return { adapter: "openalex", name: "OpenAlex", status, items, errorMessage: msg, durationMs: Date.now() - start, categories: openalexAdapter.categories, requiresKey: false };
}

function mapWork(w: OpenAlexWork, query: string): NormalizedEvidence | null {
  const title = (w.display_name ?? "").trim();
  if (!title) return null;
  if (w.is_paratext) return null;

  const url = w.primary_location?.landing_page_url || (w.doi ? `https://doi.org/${w.doi.replace(/^https?:\/\/doi\.org\//, "")}` : w.id ?? "");
  if (!url) return null;

  const journal = w.primary_location?.source?.display_name ?? "OpenAlex";
  const authors = (w.authorships ?? []).slice(0, 3).map((a) => a.author?.display_name).filter(Boolean) as string[];
  const abstract = reconstructAbstract(w.abstract_inverted_index);
  const date = w.publication_date ? new Date(w.publication_date + "T00:00:00Z").toISOString() : null;

  const queryTokens = q(query);
  const titleLow = title.toLowerCase();
  const abstractLow = abstract.toLowerCase();
  const matched = queryTokens.filter((t) => titleLow.includes(t) || abstractLow.includes(t));
  const confidence = Math.min(1, 0.3 + matched.length * 0.15);

  const snippet = abstract
    ? abstract.slice(0, 320) + (abstract.length > 320 ? "…" : "")
    : `Published in ${journal}.${authors.length ? ` Authors: ${authors.join(", ")}${(w.authorships?.length ?? 0) > 3 ? " et al." : ""}.` : ""}`;

  const limitations: string[] = [
    "Open academic-graph metadata — indexing does not equal endorsement.",
  ];
  if (w.is_retracted) limitations.unshift("This work has been RETRACTED according to OpenAlex.");

  return {
    id: evidenceId("openalex", url),
    title: title.slice(0, 220),
    sourceName: `OpenAlex — ${journal}`,
    sourceDomain: hostOf(url) || "openalex.org",
    url,
    publishedAt: date,
    snippet,
    evidenceType: w.is_retracted ? "disputes" : "related",
    sourceCategory: "academic",
    confidence,
    rawProvider: "openalex",
    matchedTerms: matched,
    limitations,
  };
}

/** OpenAlex stores abstracts as inverted-index. Reconstruct readable text. */
function reconstructAbstract(idx?: Record<string, number[]>): string {
  if (!idx) return "";
  const positioned: { word: string; pos: number }[] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const p of positions) positioned.push({ word, pos: p });
  }
  positioned.sort((a, b) => a.pos - b.pos);
  return positioned.map((p) => p.word).join(" ");
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
