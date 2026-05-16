import type { PageAnalysis } from "./page-analyzer";
import type { SpoofingResult, PathSuspicionResult } from "./spoofing";

export interface TransparencyFactor {
  label: string;
  delta: number;        // contribution (+ or -)
  detail: string;
}

export interface TransparencyReport {
  score: number;        // 0-100
  level: "low" | "medium" | "high";
  factors: TransparencyFactor[];
}

/**
 * Composite transparency score for a fetched URL. Falls back to a partial
 * score using just domain-level signals when the page wasn't fetched.
 */
export function computeTransparency(
  page: PageAnalysis | null,
  spoofing: SpoofingResult,
  path: PathSuspicionResult
): TransparencyReport {
  const factors: TransparencyFactor[] = [];
  let score = 50; // neutral baseline

  if (page && page.fetched) {
    // Author/byline
    if (page.byline) {
      score += 18;
      factors.push({
        label: "Author byline present",
        delta: 18,
        detail: `${page.byline} (via ${page.bylineSource})`,
      });
    } else {
      score -= 10;
      factors.push({
        label: "No author byline detected",
        delta: -10,
        detail: "No meta-author, JSON-LD author, or visible byline element",
      });
    }

    // Publication date
    if (page.publishedAt) {
      score += 14;
      factors.push({
        label: "Publication date present",
        delta: 14,
        detail: page.ageDays !== null
          ? `Published ~${page.ageDays} day(s) ago`
          : "Date parsed from metadata",
      });
    } else {
      score -= 8;
      factors.push({
        label: "No publication date detected",
        delta: -8,
        detail: "Articles without a date are harder to evaluate for currency",
      });
    }

    // Outbound source links
    if (page.outboundLinks >= 3) {
      const cap = Math.min(15, 5 + page.outboundLinks);
      score += cap;
      factors.push({
        label: "Cites outbound sources",
        delta: cap,
        detail: `${page.outboundLinks} link(s) to ${page.outboundDomains.length} external domain(s)`,
      });
    } else if (page.outboundLinks === 0 && page.wordCount > 300) {
      score -= 6;
      factors.push({
        label: "No outbound source links",
        delta: -6,
        detail: "Article does not cite or link to external sources",
      });
    }

    // Structured data
    if (page.hasJsonLd) {
      score += 5;
      factors.push({
        label: "Structured data (JSON-LD) present",
        delta: 5,
        detail: "Page exposes machine-readable metadata",
      });
    }

    // About / corrections pages
    if (page.hasAboutLink || page.hasContactLink) {
      score += 4;
      factors.push({
        label: "About / Contact link present",
        delta: 4,
        detail: page.hasCorrectionsLink
          ? "Including a corrections/standards page"
          : "Publisher identity is reachable",
      });
    }
    if (page.hasCorrectionsLink) {
      score += 6;
      factors.push({
        label: "Corrections / standards policy linked",
        delta: 6,
        detail: "Publisher exposes editorial accountability",
      });
    }

    // Clickbait
    if (page.clickbait && page.clickbait.score > 0) {
      const penalty = -Math.round(page.clickbait.score * 0.3);
      if (penalty !== 0) {
        score += penalty;
        factors.push({
          label: `Clickbait language (${page.clickbait.level})`,
          delta: penalty,
          detail: page.clickbait.signals.slice(0, 2).join("; ") || `${page.clickbait.score}/100`,
        });
      }
    }
  } else if (page && page.fetchError) {
    factors.push({
      label: "Page could not be fetched",
      delta: 0,
      detail: page.fetchError,
    });
  }

  // Spoofing — always applies
  if (spoofing.isSpoof) {
    score -= 30;
    factors.push({
      label: "Domain spoofing signals",
      delta: -30,
      detail: spoofing.signals[0] ?? "Lookalike domain pattern detected",
    });
  }

  // URL path suspicion
  if (path.suspicious) {
    score -= 8;
    factors.push({
      label: "Suspicious URL path",
      delta: -8,
      detail: path.signals[0] ?? "URL contains unusual patterns",
    });
  }

  const final = Math.max(0, Math.min(100, Math.round(score)));
  const level: TransparencyReport["level"] =
    final >= 70 ? "high" : final >= 45 ? "medium" : "low";

  return { score: final, level, factors };
}

export function freshnessLabel(ageDays: number | null): { label: string; tone: "good" | "neutral" | "warn" } {
  if (ageDays === null)            return { label: "no date",         tone: "warn"    };
  if (ageDays < 0)                  return { label: "future-dated",   tone: "warn"    };
  if (ageDays <= 2)                 return { label: "fresh (<48h)",   tone: "good"    };
  if (ageDays <= 14)                return { label: "recent (≤2w)",   tone: "good"    };
  if (ageDays <= 90)                return { label: "current (≤3m)",  tone: "neutral" };
  if (ageDays <= 365)               return { label: "aging (≤1y)",    tone: "neutral" };
  if (ageDays <= 365 * 3)           return { label: "older (1–3y)",   tone: "warn"    };
  return                              { label: `stale (${Math.floor(ageDays/365)}y+)`, tone: "warn" };
}
