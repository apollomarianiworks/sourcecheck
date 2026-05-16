import type { EvidenceItem, CheckResult } from "./types";

export interface ClaimLabel {
  id: string;
  text: string;
  tone: "good" | "warn" | "bad" | "neutral";
  detail?: string;
}

export interface MissingSignal {
  id: string;
  text: string;
}

// Topic indicators that imply a primary source should exist
const PRIMARY_SOURCE_TRIGGERS = [
  /\bstud(y|ies)\b/i, /\bresearch(ers?)?\b/i, /\bscientist(s)?\b/i,
  /\bfound that\b/i, /\bdiscover(ed|y)\b/i, /\bdrug\b/i, /\bvaccine\b/i,
  /\btreatment\b/i, /\bclinical trial\b/i, /\bpeer[ -]?review/i,
  /\bsurvey\b/i, /\bpoll(ed)?\b/i, /\bstatistics?\b/i, /\b\d+\s?%/,
  /\bcourt\b/i, /\bjudge\b/i, /\brul(ed|ing)\b/i, /\bsupreme court\b/i,
  /\bsenate\b/i, /\bcongress\b/i, /\bhouse of representatives\b/i,
  /\bfda\b/i, /\bcdc\b/i, /\bnih\b/i, /\bepa\b/i, /\bsec\b/i, /\bnasa\b/i,
  /\beconomy\b/i, /\binflation\b/i, /\bgdp\b/i, /\bunemployment\b/i,
];

const PRIMARY_TIER_LABELS = new Set([
  "Government Health Agency", "International Health Org", "Government Research",
  "Research Index", "Peer-Reviewed Journal", "Dedicated Fact-Checker",
  "Fact-Checker/Debunker", "Major Wire Service",
]);

const TLD_PRIMARY = /\.(gov|edu|mil|int)$/i;

interface ComputeArgs {
  claim: string;
  evidence: EvidenceItem[];
  verdict: CheckResult["evidenceVerdict"];
}

export function computeClaimLabels({ claim, evidence, verdict }: ComputeArgs): {
  labels: ClaimLabel[];
  missing: MissingSignal[];
} {
  const labels: ClaimLabel[] = [];
  const missing: MissingSignal[] = [];

  const fc       = evidence.filter((e) => e.source === "Fact Check");
  const news     = evidence.filter((e) => e.source === "GDELT");
  const wiki     = evidence.filter((e) => e.source === "Wikipedia");
  const dom      = evidence.filter((e) => e.source === "Domain DB");

  // ── 1. No evidence at all
  if (evidence.length === 0) {
    labels.push({
      id: "no-evidence",
      text: "No strong evidence found",
      tone: "warn",
      detail: "No fact-check, news, or encyclopedia entries returned for this query.",
    });
    return { labels, missing };
  }

  // ── 2. Fact-check labels (only assert stance when fact-checkers actually do)
  if (fc.length > 0) {
    if (verdict === "supports") {
      labels.push({
        id: "fc-confirmed",
        text: "Confirmed by fact-check source",
        tone: "good",
        detail: `${fc.length} fact-check review(s) rated this true/accurate.`,
      });
    } else if (verdict === "disputes") {
      labels.push({
        id: "fc-disputed",
        text: "Disputed by fact-check source",
        tone: "bad",
        detail: `${fc.length} fact-check review(s) rated this false/misleading.`,
      });
    } else if (verdict === "mixed") {
      labels.push({
        id: "fc-mixed",
        text: "Fact-checkers gave mixed ratings",
        tone: "warn",
        detail: `${fc.length} fact-check review(s) returned conflicting verdicts.`,
      });
    }
  }

  // ── 3. Multi-outlet reputable coverage
  const credibleNewsDomains = new Set(
    news.filter((n) => (n.domainScore ?? 0) >= 70).map((n) => n.domain.toLowerCase())
  );
  if (credibleNewsDomains.size >= 2) {
    labels.push({
      id: "multi-reputable",
      text: "Reported by multiple reputable sources",
      tone: "good",
      detail: `${credibleNewsDomains.size} distinct outlets at Tier B or above are covering this.`,
    });
  }

  // ── 4. Only-low-quality-sources
  if (news.length > 0 && news.every((n) => (n.domainScore ?? 50) < 50)) {
    labels.push({
      id: "low-quality-only",
      text: "Only reported by low-quality sources",
      tone: "bad",
      detail: `${news.length} news item(s); none reach a credibility score of 50.`,
    });
  }

  // ── 5. Background context only
  if (fc.length === 0 && news.length === 0 && (wiki.length > 0 || dom.length > 0)) {
    labels.push({
      id: "context-only",
      text: "Background context only",
      tone: "neutral",
      detail: "No direct news coverage or fact-check — only encyclopedia / reference entries returned.",
    });
  }

  // ── 6. Needs primary source
  const needsPrimary = PRIMARY_SOURCE_TRIGGERS.some((re) => re.test(claim));
  if (needsPrimary) {
    const hasPrimary = evidence.some((e) =>
      TLD_PRIMARY.test(e.domain) ||
      (e.domainLabel && PRIMARY_TIER_LABELS.has(e.domainLabel))
    );
    if (!hasPrimary) {
      labels.push({
        id: "needs-primary",
        text: "Needs primary source",
        tone: "warn",
        detail: "Claim references study/legal/government topics, but no .gov/.edu/peer-reviewed source was returned. Look for the original study or ruling.",
      });
    }
  }

  // ── 7. Missing signals (informational warnings)
  if (fc.length === 0) {
    missing.push({
      id: "no-factcheck",
      text: "No dedicated fact-check found. Stance is inferred only from coverage, not from a verdict.",
    });
  }
  if (news.length === 0 && fc.length === 0) {
    missing.push({
      id: "no-news",
      text: "No news coverage in the last 30 days. The topic may be older, niche, or non-English.",
    });
  }
  if (evidence.length > 0 && credibleNewsDomains.size === 0 && news.length > 0) {
    missing.push({
      id: "no-credible-news",
      text: "News coverage exists, but no Tier B+ outlets are among them. Treat with caution.",
    });
  }

  return { labels, missing };
}
