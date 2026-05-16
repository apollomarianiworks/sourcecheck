import type { SourceMeshUnderstanding } from "@/lib/types";

export function buildFollowups(understanding: SourceMeshUnderstanding, variants: string[]): { searches: string[]; betterInputs: string[] } {
  const entity = understanding.entities[0] ?? "";
  const base = understanding.convertedClaim || understanding.cleanedInput;
  const searches = new Set<string>();

  for (const variant of variants.slice(0, 5)) searches.add(variant);

  if (entity) {
    searches.add(`${entity} fact check`);
    searches.add(`${entity} lawsuit official filing`);
    searches.add(`${entity} controversy timeline`);
  }

  if (understanding.inputType === "health-claim") {
    searches.add(`${base} site:cdc.gov OR site:fda.gov`);
    searches.add(`${base} PubMed study`);
  }
  if (understanding.inputType === "finance-scam-claim") {
    searches.add(`${base} FTC consumer alert`);
    searches.add(`${base} SEC press release`);
  }
  if (understanding.inputType === "legal-court-claim") {
    searches.add(`${base} CourtListener`);
    searches.add(`${base} complaint docket`);
  }
  if (understanding.inputType === "social-url") {
    searches.add(`${entity || base} claim fact check`);
    searches.add(`${entity || base} original source`);
  }

  return {
    searches: Array.from(searches).filter((s) => s.length >= 4).slice(0, 8),
    betterInputs: betterInputs(understanding),
  };
}

function betterInputs(understanding: SourceMeshUnderstanding): string[] {
  const prompts: string[] = [];
  if (understanding.isVague) prompts.push("Add the exact name, date, platform, or location from the claim.");
  if (understanding.inputType === "social-url") prompts.push("Paste the visible caption or transcript text from the social post.");
  if (understanding.hints.dates.length === 0) prompts.push("Add when this allegedly happened.");
  if (understanding.hints.locations.length === 0 && understanding.inputType === "crime-local-claim") prompts.push("Add the city, county, or state for local/crime claims.");
  if (understanding.inputType === "health-claim") prompts.push("Add the disease, treatment, dose, and population if known.");
  if (understanding.inputType === "legal-court-claim") prompts.push("Add the court, case name, docket number, or filing date if known.");
  if (understanding.inputType === "finance-scam-claim") prompts.push("Add the company, ticker, wallet, regulator, or product name if known.");
  prompts.push("Try quoting the exact sentence being checked.");
  return Array.from(new Set(prompts)).slice(0, 6);
}
