import type { EvidenceItem, EvidenceType } from "@/lib/types";
import type { SourceCategory } from "@/lib/categories";

/**
 * Adapter-side richer view of a single evidence item.
 *
 * Every adapter under `lib/sources/*` produces NormalizedEvidence. Before
 * being merged into a CheckResult, we down-shape it to the existing
 * `EvidenceItem` (which the UI already understands) but keep the extra
 * fields attached so result UIs can surface them when present.
 */
export interface NormalizedEvidence {
  id: string;                  // stable hash of provider + url
  title: string;
  sourceName: string;          // human label, e.g. "arXiv", "PubMed"
  sourceDomain: string;        // the publisher domain
  url: string;
  publishedAt: string | null;  // ISO date
  snippet: string;
  evidenceType: EvidenceType;
  sourceCategory: SourceCategory;
  confidence: number;          // 0..1 adapter's own match confidence
  rawProvider: string;         // exact adapter id: "arxiv", "openalex", ...
  matchedTerms: string[];
  limitations: string[];       // adapter-specific caveats
}

export type AdapterStatus =
  | "ok"
  | "no-key"
  | "rate-limited"
  | "error"
  | "blocked"
  | "skipped"
  | "not-applicable";

export interface AdapterResult {
  adapter: string;             // adapter id
  name: string;                // human label
  status: AdapterStatus;
  items: NormalizedEvidence[];
  errorMessage?: string;
  durationMs: number;
  categories: ClaimCategory[];   // categories this adapter targets
  requiresKey: boolean;
}

export type ClaimCategory =
  | "politics-news"
  | "health-medical"
  | "science-research"
  | "legal-court"
  | "finance-business"
  | "technology"
  | "celebrity-viral"
  | "general";

export interface SearchOpts {
  maxResults?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SourceAdapter {
  id: string;
  name: string;
  /** Which claim categories this adapter is most useful for. */
  categories: ClaimCategory[];
  /** True if an env var or API key is required to function at all. */
  requiresKey: boolean;
  /** Whether the adapter is currently usable in this process. */
  available: () => boolean;
  /** Search the source for items matching the query. Always returns; never throws. */
  search: (query: string, opts?: SearchOpts) => Promise<AdapterResult>;
}

/**
 * Convert a NormalizedEvidence (richer) to the legacy EvidenceItem shape
 * the existing UI/route code already speaks. Extra fields are also attached
 * to the EvidenceItem object so callers can pick them up if they want to.
 */
export function toEvidenceItem(n: NormalizedEvidence): EvidenceItem & Partial<NormalizedEvidence> {
  // Map adapter -> existing EvidenceSource label used by EvidenceCard.
  const sourceLabel: EvidenceItem["source"] = (() => {
    if (n.rawProvider === "googleFactCheck" || n.evidenceType === "supports" || n.evidenceType === "disputes" || n.evidenceType === "unclear") {
      // Fact-check verdict source
      if (n.rawProvider === "googleFactCheck") return "Fact Check";
    }
    if (n.rawProvider === "wikimedia") return "Wikipedia";
    if (n.rawProvider === "gdelt")     return "GDELT";
    if (n.rawProvider === "domain-db") return "Domain DB";
    // Everything else uses GDELT-style label so the UI knows it's news/research
    // (the richer label is preserved in the publisher field and matchedTerms).
    return "GDELT";
  })();

  return {
    source: sourceLabel,
    evidenceType: n.evidenceType,
    title: n.title,
    publisher: n.sourceName,
    url: n.url,
    snippet: n.snippet,
    domain: n.sourceDomain,
    domainScore: null,        // filled in upstream by domain-scorer when items merge
    domainLabel: null,
    domainTier: null,
    date: n.publishedAt ? n.publishedAt.slice(0, 10) : null,
    relevance: n.confidence >= 0.6 ? "high" : n.confidence >= 0.3 ? "medium" : "low",
    rating: null,
    // Extra fields — non-breaking, present for components that want them.
    id: n.id,
    sourceName: n.sourceName,
    sourceDomain: n.sourceDomain,
    publishedAt: n.publishedAt ?? undefined,
    sourceCategory: n.sourceCategory,
    confidence: n.confidence,
    rawProvider: n.rawProvider,
    matchedTerms: n.matchedTerms,
    limitations: n.limitations,
  };
}

/** Convenience: stable hash for the id field. */
export function evidenceId(provider: string, url: string): string {
  let h = 0;
  const seed = `${provider}|${url}`;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return `${provider}-${(h >>> 0).toString(36)}`;
}

/** Extract a host from any URL, normalised. Returns "" on parse failure. */
export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}
