import { adaptersForClaim } from "@/lib/sources";
import type { ClaimCategory } from "@/lib/sources/types";
import type { SourceMeshUnderstanding } from "@/lib/types";

export interface SourceRoutePlan {
  categories: ClaimCategory[];
  adapterIds: string[];
  rationale: string[];
}

export function routeSources(understanding: SourceMeshUnderstanding): SourceRoutePlan {
  const adapterIds = new Set(adaptersForClaim(understanding.categories));
  const rationale: string[] = [];

  if (understanding.inputType === "social-url") {
    adapterIds.add("googleFactCheck");
    adapterIds.add("gdelt");
    adapterIds.add("reddit");
    adapterIds.add("rss");
    rationale.push("Social URLs are checked for public metadata and then routed to fact-check/news/source-tracing searches.");
  }

  if (understanding.inputType === "finance-scam-claim") {
    adapterIds.add("rss");
    adapterIds.add("gdelt");
    rationale.push("Finance/scam claims prioritize FTC/SEC/rss and news context.");
  }

  if (understanding.inputType === "legal-court-claim") {
    adapterIds.add("courtlistener");
    rationale.push("Legal claims need court records or official filings where available.");
  }

  if (understanding.inputType === "health-claim") {
    adapterIds.add("pubmed");
    adapterIds.add("semanticScholar");
    adapterIds.add("rss");
    rationale.push("Health claims need biomedical literature and official agency sources.");
  }

  if (understanding.inputType === "ai-deepfake-claim") {
    adapterIds.add("gdelt");
    adapterIds.add("github");
    adapterIds.add("stackexchange");
    adapterIds.add("hackernews");
    rationale.push("AI/deepfake claims need independent reporting or primary media-forensics sources.");
  }

  adapterIds.add("wikimedia");
  adapterIds.add("gdelt");
  adapterIds.add("rss");

  if (understanding.categories.includes("technology")) {
    adapterIds.add("github");
    adapterIds.add("stackexchange");
    adapterIds.add("semanticScholar");
  }

  if (understanding.categories.includes("science-research")) {
    adapterIds.add("semanticScholar");
    adapterIds.add("openalex");
    adapterIds.add("crossref");
  }

  return {
    categories: understanding.categories,
    adapterIds: Array.from(adapterIds),
    rationale,
  };
}
