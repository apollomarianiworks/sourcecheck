import type { SourceAdapter, AdapterResult, NormalizedEvidence, SearchOpts } from "./types";
import { evidenceId, hostOf } from "./types";

const ENDPOINT = "https://export.arxiv.org/api/query";

/**
 * arXiv API — physics/math/CS preprints. Returns Atom XML.
 * No key required. Free for non-commercial use.
 */
export const arxivAdapter: SourceAdapter = {
  id: "arxiv",
  name: "arXiv",
  categories: ["science-research", "technology"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const url = `${ENDPOINT}?search_query=${encodeURIComponent("all:" + query)}&start=0&max_results=${max}&sortBy=relevance`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ProofbaseBot/1.0 (public source verification)" },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return statusOnly("rate-limited", start, "arXiv rate limit reached");
      if (!res.ok)             return statusOnly("error", start, `arXiv returned ${res.status}`);

      const xml = await res.text();
      const items = parseArxivAtom(xml, query);
      return { adapter: "arxiv", name: "arXiv", status: "ok", items, durationMs: Date.now() - start, categories: arxivAdapter.categories, requiresKey: false };
    } catch (e) {
      return statusOnly("error", start, e instanceof Error ? e.message : String(e));
    }
  },
};

function statusOnly(status: AdapterResult["status"], start: number, msg?: string): AdapterResult {
  return { adapter: "arxiv", name: "arXiv", status, items: [], errorMessage: msg, durationMs: Date.now() - start, categories: arxivAdapter.categories, requiresKey: false };
}

/** Minimal Atom XML parser for arXiv entries — no XML lib needed. */
function parseArxivAtom(xml: string, query: string): NormalizedEvidence[] {
  const items: NormalizedEvidence[] = [];
  const entries = xml.split(/<entry\b/i).slice(1);
  const queryTokens = tokens(query);

  for (const e of entries) {
    const id = extract(e, "id");
    const title = clean(extract(e, "title"));
    const summary = clean(extract(e, "summary"));
    const published = extract(e, "published") || extract(e, "updated") || null;
    // Authors
    const authors: string[] = [];
    const authorBlocks = e.split(/<author\b/i).slice(1);
    for (const ab of authorBlocks) {
      const n = extract(ab, "name");
      if (n) authors.push(n.trim());
    }
    if (!id || !title) continue;

    const url = id.trim();
    const matched = queryTokens.filter((t) => title.toLowerCase().includes(t) || summary.toLowerCase().includes(t));
    const confidence = Math.min(1, 0.3 + matched.length * 0.15);

    items.push({
      id: evidenceId("arxiv", url),
      title: title.slice(0, 220),
      sourceName: authors.length > 0 ? `arXiv — ${authors.slice(0, 2).join(", ")}${authors.length > 2 ? " et al." : ""}` : "arXiv",
      sourceDomain: hostOf(url) || "arxiv.org",
      url,
      publishedAt: published,
      snippet: summary.slice(0, 320) + (summary.length > 320 ? "…" : ""),
      evidenceType: "related",
      sourceCategory: "academic",
      confidence,
      rawProvider: "arxiv",
      matchedTerms: matched,
      limitations: ["Preprint server — NOT peer-reviewed at time of posting."],
    });
  }
  return items;
}

function extract(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(q: string): string[] {
  return q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
