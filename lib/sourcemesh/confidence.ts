import type { CheckResult, SourceMeshConfidenceLabel, SourceMeshUnderstanding } from "@/lib/types";

export function sourceMeshConfidence(
  result: Pick<CheckResult, "evidence" | "evidenceVerdict" | "confidence" | "coverageLevel">,
  understanding: SourceMeshUnderstanding
): { label: SourceMeshConfidenceLabel; uncertaintyLevel: "low" | "medium" | "high" | "very-high"; missingEvidence: string[] } {
  const missing: string[] = [];

  if (understanding.isOpinion) {
    return {
      label: "Opinion/not fact-checkable",
      uncertaintyLevel: "very-high",
      missingEvidence: ["The input appears to be an opinion or value judgment; evidence can only provide context."],
    };
  }

  if (understanding.isVague) {
    missing.push("More specific names, dates, platform, location, or exact wording.");
  }

  const primaryNeeded = needsPrimarySource(understanding);
  const hasFactCheck = result.evidence.some((e) => e.source === "Fact Check");
  const hasPrimaryish = result.evidence.some((e) => /\b(courtlistener|court|cdc|fda|nih|sec|ftc|nasa|bls|census|pubmed)\b/i.test(`${e.publisher} ${e.domain} ${e.url}`));
  const strongContext = result.evidence.filter((e) => isStrongContext(e));
  const independentStrongDomains = new Set(strongContext.map((e) => e.domain.replace(/^www\./i, "").toLowerCase())).size;
  const weakContextCount = result.evidence.filter((e) => isWeakContext(e)).length;
  const evidenceCount = result.evidence.length;

  if (primaryNeeded && !hasPrimaryish) {
    missing.push("A primary source such as a filing, agency release, study record, or official statement.");
  }
  if (!hasFactCheck) {
    missing.push("A dedicated fact-check that matches the exact claim wording.");
  }
  if (result.coverageLevel === "low") {
    missing.push("Independent corroboration from multiple unrelated sources.");
  }
  if (weakContextCount > strongContext.length) {
    missing.push("Stronger non-social evidence; forum posts and screenshots are weak context.");
  }

  if (result.evidenceVerdict === "mixed") {
    missing.push("A source-by-source reconciliation explaining why evidence conflicts.");
    return { label: "Mixed evidence", uncertaintyLevel: "high", missingEvidence: unique(missing) };
  }

  if (evidenceCount === 0) {
    return { label: understanding.isVague ? "Too vague to verify" : "No strong evidence found", uncertaintyLevel: "very-high", missingEvidence: unique(missing) };
  }

  if (primaryNeeded && !hasPrimaryish) {
    return { label: "Needs primary source", uncertaintyLevel: "high", missingEvidence: unique(missing) };
  }

  if (hasFactCheck && result.confidence.level === "high") {
    return { label: "Strong evidence found", uncertaintyLevel: "low", missingEvidence: unique(missing) };
  }

  if (evidenceCount >= 3 && result.coverageLevel !== "low" && independentStrongDomains >= 2) {
    return { label: "Moderate evidence found", uncertaintyLevel: "medium", missingEvidence: unique(missing) };
  }

  return { label: "Weak evidence found", uncertaintyLevel: "high", missingEvidence: unique(missing) };
}

function isStrongContext(evidence: CheckResult["evidence"][number]): boolean {
  const haystack = `${evidence.publisher} ${evidence.domain} ${evidence.url}`.toLowerCase();
  if (/\b(reddit|hacker news|news.ycombinator|stackoverflow|stackexchange|youtube|tiktok|instagram|twitter|x.com|facebook|threads)\b/i.test(haystack)) {
    return false;
  }
  if (evidence.source === "Fact Check") return true;
  if (/\b\.gov\b|courtlistener|pubmed|nih|cdc|fda|sec|ftc|nasa|bls|census|who\.int|europa\.eu/i.test(haystack)) {
    return evidence.relevance !== "low";
  }
  return evidence.relevance === "high";
}

function isWeakContext(evidence: CheckResult["evidence"][number]): boolean {
  return /\b(reddit|hacker news|news.ycombinator|stackoverflow|stackexchange|youtube|tiktok|instagram|twitter|x.com|facebook|threads)\b/i.test(
    `${evidence.publisher} ${evidence.domain} ${evidence.url}`
  );
}

function needsPrimarySource(understanding: SourceMeshUnderstanding): boolean {
  return [
    "health-claim",
    "legal-court-claim",
    "finance-scam-claim",
    "crime-local-claim",
    "science-research-claim",
    "ai-deepfake-claim",
  ].includes(understanding.inputType);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
