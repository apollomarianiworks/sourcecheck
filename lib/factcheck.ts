import type { EvidenceItem, EvidenceType } from "./types";
import { scoreDomain, extractDomain } from "./domain-scorer";

interface GoogleClaimReview {
  publisher?: { name?: string; site?: string };
  url?: string;
  title?: string;
  reviewDate?: string;
  textualRating?: string;
  languageCode?: string;
}

interface GoogleClaim {
  text?: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: GoogleClaimReview[];
}

interface GoogleResponse {
  claims?: GoogleClaim[];
  nextPageToken?: string;
}

export type FactCheckStatus = "ok" | "no-key" | "error" | "rate-limited";

export interface FactCheckResult {
  status: FactCheckStatus;
  items: EvidenceItem[];
  errorMessage?: string;
}

const NEGATIVE_RATINGS = [
  "false", "incorrect", "wrong", "untrue", "inaccurate", "fake",
  "pants on fire", "fabricated", "fiction", "debunked", "no evidence",
  "baseless", "misleading false", "mostly false", "four pinocchios",
];

const POSITIVE_RATINGS = [
  "true", "correct", "accurate", "confirmed", "verified",
  "mostly true", "true.", "geprüft", "geprueft",
];

const UNCLEAR_RATINGS = [
  "misleading", "mixed", "mixture", "partly true", "partly false",
  "half true", "half-true", "exaggerated", "needs context", "missing context",
  "unproven", "lacks context", "out of context", "two pinocchios",
  "three pinocchios", "spins the facts",
];

function classifyRating(rating: string | undefined): EvidenceType {
  if (!rating) return "related";
  const r = rating.toLowerCase().trim();

  if (NEGATIVE_RATINGS.some((n) => r.includes(n))) return "disputes";
  if (UNCLEAR_RATINGS.some((u) => r.includes(u))) return "unclear";
  if (POSITIVE_RATINGS.some((p) => r === p || r.startsWith(p))) return "supports";

  return "related";
}

/**
 * Tokenize for similarity comparison — lowercased content words only.
 */
const STANCE_STOP = new Set([
  "the","a","an","is","are","was","were","be","been","being","by","of","for","to","in",
  "on","at","and","or","but","that","this","it","with","as","from","not","no","do","does",
  "did","have","has","had","will","would","can","could","may","might","should","i","you",
  "we","they","them","their","there","than","so","if","then","also","just","very",
]);

function contentTokens(s: string): Set<string> {
  const tokens = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/);
  return new Set(tokens.filter((t) => t.length >= 3 && !STANCE_STOP.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const NEGATIONS = /\b(no|not|n['']t|never|isn['']t|aren['']t|doesn['']t|didn['']t|wasn['']t|weren['']t|cannot|can['']t|won['']t)\b/i;

/**
 * Decide whether to trust the API's rating as the stance toward the USER'S claim.
 *
 *  - high overlap & matching polarity → trust the rating
 *  - high overlap & inverted polarity → flip the stance (true ↔ false)
 *  - low overlap                       → don't infer stance; demote to "related"
 */
function reconcileStance(
  userQuery: string,
  claimText: string,
  ratedType: EvidenceType
): { type: EvidenceType; reliability: "trusted" | "flipped" | "demoted" } {
  if (ratedType === "related" || ratedType === "unclear") {
    return { type: ratedType, reliability: "trusted" };
  }
  const a = contentTokens(userQuery);
  const b = contentTokens(claimText);
  const sim = jaccard(a, b);

  if (sim < 0.2) {
    // Different topic / phrasing — we can't tell whether the rating applies to the user's claim
    return { type: "related", reliability: "demoted" };
  }

  const userNeg = NEGATIONS.test(userQuery);
  const claimNeg = NEGATIONS.test(claimText);
  if (userNeg !== claimNeg) {
    // Inverted polarity → the rating's truth value applies to the OPPOSITE of what the user said
    if (ratedType === "supports") return { type: "disputes", reliability: "flipped" };
    if (ratedType === "disputes") return { type: "supports", reliability: "flipped" };
  }

  return { type: ratedType, reliability: "trusted" };
}

export async function searchFactCheck(query: string): Promise<FactCheckResult> {
  const apiKey = process.env.FACTCHECK_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return { status: "no-key", items: [] };
  }

  const encoded = encodeURIComponent(query.trim());
  const url =
    `https://factchecktools.googleapis.com/v1alpha1/claims:search` +
    `?query=${encoded}` +
    `&languageCode=en-US` +
    `&pageSize=10` +
    `&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FactCheckerApp/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      return {
        status: "rate-limited",
        items: [],
        errorMessage: "Google Fact Check quota exceeded. Try again later.",
      };
    }

    if (res.status === 400 || res.status === 403) {
      return {
        status: "error",
        items: [],
        errorMessage: `Google Fact Check rejected the request (${res.status}). Check that FACTCHECK_API_KEY is valid and the Fact Check Tools API is enabled.`,
      };
    }

    if (!res.ok) {
      return {
        status: "error",
        items: [],
        errorMessage: `Google Fact Check returned ${res.status}`,
      };
    }

    const data: GoogleResponse = await res.json();
    const claims = data.claims ?? [];

    const items: EvidenceItem[] = [];

    for (const claim of claims) {
      const reviews = claim.claimReview ?? [];
      for (const review of reviews) {
        if (!review.url) continue;

        const domain = review.publisher?.site
          ? extractDomain(review.publisher.site)
          : extractDomain(review.url);

        const domainScore = scoreDomain(domain);
        const ratedType = classifyRating(review.textualRating);
        const publisherName = review.publisher?.name ?? domain;

        const claimText = claim.text ?? review.title ?? "Untitled claim";
        const reviewTitle = review.title ?? claimText;

        const { type: evidenceType, reliability } = reconcileStance(query, claimText, ratedType);

        let snippet = buildSnippet(claim, review);
        if (reliability === "flipped") {
          snippet = `[stance inverted relative to query] ${snippet}`;
        } else if (reliability === "demoted") {
          snippet = `[rating may not apply to your exact query] ${snippet}`;
        }

        items.push({
          source: "Fact Check",
          evidenceType,
          title: reviewTitle.slice(0, 240),
          publisher: publisherName,
          url: review.url,
          snippet,
          domain,
          domainScore: domainScore?.finalScore ?? null,
          domainLabel: domainScore?.label ?? null,
          domainTier: domainScore?.tier ?? null,
          date: review.reviewDate ? review.reviewDate.slice(0, 10) : claim.claimDate?.slice(0, 10) ?? null,
          relevance: "high",
          rating: review.textualRating ?? null,
        });
      }
    }

    // Sort: disputes/supports before unclear/related
    const order: Record<EvidenceType, number> = {
      disputes: 0,
      supports: 1,
      unclear: 2,
      related: 3,
    };
    items.sort((a, b) => order[a.evidenceType] - order[b.evidenceType]);

    return { status: "ok", items };
  } catch (e) {
    return {
      status: "error",
      items: [],
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildSnippet(claim: GoogleClaim, review: GoogleClaimReview): string {
  const parts: string[] = [];

  if (claim.claimant) parts.push(`Claimant: ${claim.claimant}`);
  if (claim.text && claim.text !== review.title) {
    const text = claim.text.length > 200 ? claim.text.slice(0, 200) + "…" : claim.text;
    parts.push(`Claim: "${text}"`);
  }
  if (review.textualRating) parts.push(`Rating: ${review.textualRating}`);

  return parts.join(" · ");
}
