import type { EvidenceItem, CheckResult } from "./types";
import type { SafetyWarning, ClaimQualityResult } from "./claim-quality";

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export interface ConfidenceReport {
  level: ConfidenceLevel;
  score: number;             // 0–100 — for display, not a probability
  rationale: string;
  factors: { label: string; delta: number; detail: string }[];
}

export interface Suggestion {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}

interface BuildArgs {
  verdict: CheckResult["evidenceVerdict"];
  evidence: EvidenceItem[];
  quality: ClaimQualityResult;
  hasFactCheckKey: boolean;
  apiStatus: CheckResult["apiStatus"];
}

/**
 * Confidence in the VERDICT (not the truth). High confidence = many credible
 * sources, mostly agreeing, recent, fact-checker-backed. Low = sparse, old,
 * mismatched, or from low-quality outlets.
 *
 * This is deliberately conservative. If anything looks shaky, we report low.
 */
export function computeConfidence(args: BuildArgs): ConfidenceReport {
  const { verdict, evidence, quality, hasFactCheckKey } = args;
  const factors: ConfidenceReport["factors"] = [];

  // Insufficient short-circuit
  if (verdict === "none" || evidence.length === 0) {
    return {
      level: "insufficient",
      score: 0,
      rationale: "No evidence was returned by any source.",
      factors: [{ label: "No evidence", delta: 0, detail: "Sources returned zero items for this query." }],
    };
  }

  let base = 50;

  const fc       = evidence.filter((e) => e.source === "Fact Check");
  const distinctDomains = new Set(evidence.map((e) => e.domain.toLowerCase()));
  const credibleDomains = new Set(
    evidence.filter((e) => (e.domainScore ?? 0) >= 70).map((e) => e.domain.toLowerCase())
  );

  // Fact-check presence
  if (fc.length >= 2) {
    base += 20;
    factors.push({ label: "Multiple fact-check reviews", delta: 20, detail: `${fc.length} reviews returned` });
  } else if (fc.length === 1) {
    base += 8;
    factors.push({ label: "One fact-check review", delta: 8, detail: "Single reviewer — weaker than multi-source agreement" });
  } else {
    base -= 5;
    factors.push({ label: "No fact-check review", delta: -5, detail: "No dedicated fact-checker rated this exact phrasing" });
  }

  // Diversity of outlets
  if (credibleDomains.size >= 3) {
    base += 12;
    factors.push({ label: "Multiple credible outlets", delta: 12, detail: `${credibleDomains.size} distinct Tier-B+ publishers` });
  } else if (credibleDomains.size === 1) {
    base -= 5;
    factors.push({ label: "Only one credible outlet", delta: -5, detail: "Single-source signal — corroboration is weak" });
  } else if (credibleDomains.size === 0) {
    base -= 12;
    factors.push({ label: "No credible outlets", delta: -12, detail: "Nothing returned at Tier B or above" });
  }

  // Stance agreement (only matters when fact-checks exist)
  if (fc.length >= 2) {
    const stances = fc.map((e) => e.evidenceType);
    const counts: Record<string, number> = {};
    for (const s of stances) counts[s] = (counts[s] ?? 0) + 1;
    const top = Math.max(...Object.values(counts));
    const agreement = top / fc.length;
    if (agreement >= 0.8) {
      base += 8;
      factors.push({ label: "Fact-checkers agree", delta: 8, detail: `${Math.round(agreement * 100)}% same stance` });
    } else if (verdict === "mixed") {
      base -= 12;
      factors.push({ label: "Fact-checkers disagree", delta: -12, detail: "Mixed stance across reviews" });
    }
  }

  // Recency (use freshest news/fc item)
  const latest = latestDate(evidence);
  if (latest !== null) {
    const ageDays = (Date.now() - latest) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) {
      base += 5;
      factors.push({ label: "Recent coverage", delta: 5, detail: `Latest item ${Math.round(ageDays)} days old` });
    } else if (ageDays > 365 * 2) {
      base -= 8;
      factors.push({ label: "Evidence is old", delta: -8, detail: `Latest item is ${Math.round(ageDays / 365)} years old` });
    }
  }

  // Claim-quality penalties
  if (quality.isVague) {
    base -= 10;
    factors.push({ label: "Vague claim", delta: -10, detail: "Short or generic claim — fewer matches and weaker signal" });
  }
  if (quality.isOpinion) {
    base -= 12;
    factors.push({ label: "Opinion-style language", delta: -12, detail: "Opinions are not fact-checkable" });
  }
  if (quality.isFuturePrediction) {
    base -= 8;
    factors.push({ label: "Future prediction", delta: -8, detail: "Predictions cannot be verified by current evidence" });
  }
  if (quality.needsExpert) {
    base -= 6;
    factors.push({ label: "Expert interpretation needed", delta: -6, detail: `Claim is in the ${quality.needsExpert} domain` });
  }

  // No API key — meaningful gap
  if (!hasFactCheckKey) {
    base -= 5;
    factors.push({ label: "Fact Check API disabled", delta: -5, detail: "Google Fact Check Tools was not consulted" });
  }

  // Only-one-source
  if (distinctDomains.size === 1) {
    base -= 10;
    factors.push({ label: "Single source", delta: -10, detail: `Everything came from one domain (${[...distinctDomains][0]})` });
  }

  const score = Math.max(0, Math.min(100, Math.round(base)));
  const level: ConfidenceLevel =
    score >= 75 ? "high" :
    score >= 55 ? "medium" :
    score >= 35 ? "low" :
                  "insufficient";

  const rationale = (() => {
    switch (level) {
      case "high":         return "Multiple credible sources, mostly agreeing, with fact-checker presence.";
      case "medium":       return "Evidence exists but with notable gaps in corroboration, recency, or fact-checker support.";
      case "low":          return "Sparse, weak, or inconsistent evidence. Treat the verdict cautiously.";
      case "insufficient": return "Evidence is too thin to draw any conclusion.";
    }
  })();

  return { level, score, rationale, factors };
}

function latestDate(evidence: EvidenceItem[]): number | null {
  let latest: number | null = null;
  for (const e of evidence) {
    if (!e.date) continue;
    const t = Date.parse(e.date);
    if (Number.isNaN(t)) continue;
    if (latest === null || t > latest) latest = t;
  }
  return latest;
}

/**
 * Concrete, actionable suggestions for improving the check. Driven by the
 * specific gaps detected, not generic advice.
 */
export function buildSuggestions(args: BuildArgs & { confidence: ConfidenceReport; warnings: SafetyWarning[] }): Suggestion[] {
  const out: Suggestion[] = [];
  const { evidence, quality, hasFactCheckKey, apiStatus, warnings } = args;

  const fc = evidence.filter((e) => e.source === "Fact Check");
  const credibleDomains = new Set(
    evidence.filter((e) => (e.domainScore ?? 0) >= 70).map((e) => e.domain.toLowerCase())
  );

  if (!hasFactCheckKey) {
    out.push({
      id: "add-fc-key",
      priority: "high",
      text: "Add a FACTCHECK_API_KEY (free from Google Cloud Console) to enable dedicated fact-checker matching.",
    });
  }
  if (quality.isVague) {
    out.push({
      id: "specify-claim",
      priority: "high",
      text: "Rephrase the claim with specific names, dates, places, or numbers — the more distinct, the better the match.",
    });
  }
  if (quality.isOpinion) {
    out.push({
      id: "extract-factual-core",
      priority: "high",
      text: "Strip opinion words ('best', 'should', 'I think') and keep only the factual assertion you want checked.",
    });
  }
  if (quality.isFuturePrediction) {
    out.push({
      id: "check-assumptions",
      priority: "medium",
      text: "Future predictions cannot be verified directly. Check the assumptions or trends the prediction is built on instead.",
    });
  }
  if (quality.needsExpert) {
    out.push({
      id: "consult-expert",
      priority: "high",
      text: `Consult a licensed ${quality.needsExpert} professional for actionable decisions — this tool surfaces sources only.`,
    });
  }
  if (fc.length === 0 && evidence.length > 0) {
    out.push({
      id: "search-fact-checkers",
      priority: "medium",
      text: "No fact-check matched this phrasing. Try searching directly on Snopes, PolitiFact, or FactCheck.org with different wording.",
    });
  }
  if (credibleDomains.size === 0 && evidence.length > 0) {
    out.push({
      id: "find-tier-b-source",
      priority: "high",
      text: "No Tier-B+ outlets covered this. Look for coverage in a wire service (Reuters/AP) or an established newspaper.",
    });
  }
  if (warnings.some((w) => w.id === "evidence-stale")) {
    out.push({
      id: "find-recent",
      priority: "medium",
      text: "Existing evidence is old. Search for recent reporting to see whether the situation has changed.",
    });
  }
  if (warnings.some((w) => w.id === "sources-disagree")) {
    out.push({
      id: "read-both",
      priority: "medium",
      text: "Read the conflicting fact-checks directly — disagreement often hinges on which version of the claim was rated.",
    });
  }
  if (warnings.some((w) => w.id === "unknown-publisher")) {
    out.push({
      id: "check-publisher",
      priority: "medium",
      text: "The publisher is not in our database. Check whether it has an 'About' page, a masthead, and a corrections policy.",
    });
  }
  if (apiStatus.gdelt === "rate-limited" || apiStatus.factcheck === "rate-limited" || apiStatus.wikipedia === "rate-limited") {
    out.push({
      id: "retry-later",
      priority: "low",
      text: "One or more upstream APIs was rate-limited. Wait a minute and re-run the scan for fuller coverage.",
    });
  }

  return out;
}

/**
 * Convert evidence-level signals into the corresponding SafetyWarnings.
 */
export function deriveSafetyWarnings(args: {
  evidence: EvidenceItem[];
  verdict: CheckResult["evidenceVerdict"];
  domainAnalysisKnown: boolean | null;
}): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const { evidence, verdict, domainAnalysisKnown } = args;

  if (evidence.length === 0) return warnings;

  const distinctDomains = new Set(evidence.map((e) => e.domain.toLowerCase()));
  if (distinctDomains.size === 1) {
    warnings.push({
      id: "single-source",
      tone: "warn",
      text: `All evidence is from a single domain (${[...distinctDomains][0]}). Corroboration is weak.`,
    });
  }

  if (domainAnalysisKnown === false) {
    warnings.push({
      id: "unknown-publisher",
      tone: "warn",
      text: "The publisher is not in our reputation database. We can't independently assess its editorial track record.",
    });
  }

  const latest = (() => {
    let l: number | null = null;
    for (const e of evidence) {
      if (!e.date) continue;
      const t = Date.parse(e.date);
      if (Number.isNaN(t)) continue;
      if (l === null || t > l) l = t;
    }
    return l;
  })();
  if (latest !== null) {
    const ageDays = (Date.now() - latest) / (1000 * 60 * 60 * 24);
    if (ageDays > 365) {
      warnings.push({
        id: "evidence-stale",
        tone: "warn",
        text: `Newest evidence is ${Math.round(ageDays / 365)} year(s) old. Situations may have changed since.`,
      });
    }
  }

  if (verdict === "mixed") {
    warnings.push({
      id: "sources-disagree",
      tone: "warn",
      text: "Fact-checkers reached different conclusions on this claim. Read the conflicting reviews directly.",
    });
  }

  const fc = evidence.filter((e) => e.source === "Fact Check");
  if (fc.length > 0 && fc.every((e) => e.evidenceType === "related" && e.snippet.includes("may not apply"))) {
    warnings.push({
      id: "demoted-stance-majority",
      tone: "warn",
      text: "All fact-check matches were demoted to 'related' because the ratings didn't apply directly to your claim. The verdict is not supported by direct fact-checker output.",
    });
  }

  return warnings;
}
