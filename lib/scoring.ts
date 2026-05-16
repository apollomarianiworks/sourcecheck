import type { EvidenceItem, CheckResult } from "./types";

export interface ScoreFactor {
  label: string;
  delta: number;          // contribution to final score
  detail?: string;
}

export interface ScoreBreakdown {
  score: number | null;
  factors: ScoreFactor[];
}

/**
 * Source Quality Score (0-100) with itemized factor breakdown.
 * Not a truth verdict — reflects credibility of outlets engaging the topic.
 */
export function computeScoreBreakdown(evidence: EvidenceItem[]): ScoreBreakdown {
  if (evidence.length === 0) return { score: null, factors: [] };

  const factors: ScoreFactor[] = [];

  const factChecks = evidence.filter((e) => e.source === "Fact Check");
  const newsItems  = evidence.filter((e) => e.source === "GDELT");

  const allScores = evidence
    .map((e) => e.domainScore ?? 50)
    .sort((a, b) => b - a);
  const top = allScores.slice(0, 7);
  const baseMean = top.reduce((s, v) => s + v, 0) / top.length;

  let score = baseMean;
  factors.push({
    label: "Median outlet credibility (top 7)",
    delta: Math.round(baseMean),
    detail: `Mean of ${top.length} highest domain scores: ${top.map((v) => v.toFixed(0)).join(", ")}`,
  });

  // Fact-check blend
  if (factChecks.length > 0) {
    const bestFc = Math.max(...factChecks.map((f) => f.domainScore ?? 60));
    const before = score;
    score = score * 0.6 + bestFc * 0.4;
    factors.push({
      label: "Fact-checker presence",
      delta: Math.round(score - before),
      detail: `${factChecks.length} dedicated fact-check review(s); top reviewer scores ${bestFc}/100`,
    });
  }

  // Breadth
  const credibleDomains = new Set(
    evidence.filter((e) => (e.domainScore ?? 0) >= 70).map((e) => e.domain)
  );
  const breadthBonus = Math.min(8, credibleDomains.size * 2);
  if (breadthBonus !== 0) {
    score += breadthBonus;
    factors.push({
      label: "Corroboration breadth",
      delta: breadthBonus,
      detail: `${credibleDomains.size} distinct outlet(s) at Tier B or better`,
    });
  }

  // Recency
  const now = Date.now();
  const recent = newsItems.filter((n) => {
    if (!n.date) return false;
    const t = Date.parse(n.date);
    if (Number.isNaN(t)) return false;
    return (now - t) / (1000 * 60 * 60 * 24) <= 14;
  });
  if (recent.length >= 3) {
    score += 3;
    factors.push({
      label: "Recency",
      delta: 3,
      detail: `${recent.length} news items from the last 14 days`,
    });
  }

  // Low-tier-only penalty
  const lowTierOnly = evidence.every((e) => (e.domainScore ?? 50) < 50);
  if (lowTierOnly) {
    score -= 8;
    factors.push({
      label: "Low-tier-only penalty",
      delta: -8,
      detail: "Every source scored under 50 — limited editorial vetting",
    });
  }

  const final = Math.max(0, Math.min(100, Math.round(score)));
  return { score: final, factors };
}

export function computeSourceQualityScore(evidence: EvidenceItem[]): number | null {
  return computeScoreBreakdown(evidence).score;
}

export function computeVerdict(evidence: EvidenceItem[]): CheckResult["evidenceVerdict"] {
  if (evidence.length === 0) return "none";

  const factChecks = evidence.filter((e) => e.source === "Fact Check");

  if (factChecks.length > 0) {
    let disputes = 0, supports = 0, unclear = 0;
    for (const fc of factChecks) {
      const weight = (fc.domainScore ?? 60) / 100;
      if (fc.evidenceType === "disputes") disputes += weight;
      else if (fc.evidenceType === "supports") supports += weight;
      else if (fc.evidenceType === "unclear") unclear += weight;
    }
    const total = disputes + supports + unclear;
    if (total === 0) return "related-only";
    if (disputes > supports * 1.2 && disputes > unclear) return "disputes";
    if (supports > disputes * 1.2 && supports > unclear) return "supports";
    return "mixed";
  }

  return "related-only";
}

export function verdictLabel(v: CheckResult["evidenceVerdict"]): string {
  switch (v) {
    case "disputes":     return "FACT-CHECKERS DISPUTE THIS";
    case "supports":     return "FACT-CHECKERS SUPPORT THIS";
    case "mixed":        return "FACT-CHECKERS ARE MIXED";
    case "related-only": return "NO DIRECT FACT-CHECK — RELATED COVERAGE ONLY";
    case "none":         return "NO EVIDENCE FOUND";
  }
}

export function strongestSources(evidence: EvidenceItem[], limit = 3): EvidenceItem[] {
  return [...evidence]
    .filter((e) => e.domainScore !== null)
    .sort((a, b) => (b.domainScore ?? 0) - (a.domainScore ?? 0))
    .slice(0, limit);
}

export function weakestSignals(evidence: EvidenceItem[], limit = 3): EvidenceItem[] {
  return [...evidence]
    .filter((e) => e.domainScore !== null)
    .sort((a, b) => {
      // weakest = low score + low relevance
      const relMap = { high: 2, medium: 1, low: 0 };
      const aScore = (a.domainScore ?? 50) + relMap[a.relevance] * 10;
      const bScore = (b.domainScore ?? 50) + relMap[b.relevance] * 10;
      return aScore - bScore;
    })
    .slice(0, limit);
}
