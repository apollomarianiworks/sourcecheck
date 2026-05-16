import { detectMode } from "@/lib/detect-mode";
import { normalizeClaim, normalizeDomain, normalizeUrl } from "@/lib/normalize";
import { analyzeClaimQuality } from "@/lib/claim-quality";
import { detectCategory } from "@/lib/sources";
import type { ClaimCategory } from "@/lib/sources/types";
import type { SourceMeshInputType, SourceMeshUnderstanding } from "@/lib/types";
import { detectSocialUrl } from "@/lib/social/detect-social-url";

const STOPWORDS = new Set([
  "a","an","and","are","about","be","but","by","did","do","does","for","from","has","have","i",
  "in","is","it","of","on","or","real","really","that","the","thing","this","to","true","was","were",
  "what","when","where","who","why","with","best","good","bad","somebody","someone","something","stuff",
]);

const SYNONYMS: Record<string, string[]> = {
  lottery: ["giveaway", "sweepstakes", "contest"],
  illegal: ["lawsuit", "legal issue", "FTC", "investigation"],
  scam: ["fraud", "consumer alert", "FTC warning"],
  fake: ["hoax", "false", "misleading"],
  deepfake: ["AI generated", "synthetic media", "voice clone"],
  cure: ["treatment", "clinical trial", "FDA warning"],
  lawsuit: ["court filing", "complaint", "legal controversy"],
  allegations: ["controversy", "claims", "investigation"],
};

const TYPO_NORMALIZATIONS: [RegExp, string][] = [
  [/\bmr\s*beast\b/gi, "MrBeast"],
  [/\bmrbeasts\b/gi, "MrBeast"],
  [/\btik\s*tok\b/gi, "TikTok"],
  [/\btwiter\b/gi, "Twitter"],
  [/\byoutub\b/gi, "YouTube"],
  [/\bgive\s*away\b/gi, "giveaway"],
  [/\bsweepstake\b/gi, "sweepstakes"],
  [/\billegal lottery\b/gi, "lottery legality"],
  [/\bdeep fake\b/gi, "deepfake"],
  [/\bcovid19\b/gi, "COVID-19"],
];

export function understandQuery(input: string): SourceMeshUnderstanding {
  const trimmed = input.trim();
  const mode = detectMode(trimmed);
  const social = detectSocialUrl(trimmed);
  const cleanedInput = cleanup(trimmed);
  const quality = analyzeClaimQuality(cleanedInput);
  const convertedClaim = questionToClaim(cleanedInput);
  const detected = detectCategory(convertedClaim);
  const inputType = classifyInput(trimmed, mode, social.isSocial, detected.primary, quality.isVague, quality.isOpinion);
  const searchIntent = classifyIntent(trimmed, inputType);
  const hints = extractHints(convertedClaim);
  const entities = Array.from(new Set([...hints.people, ...hints.organizations, ...properEntities(convertedClaim)]));
  const categories = refineCategories(detected.all, inputType, convertedClaim);

  return {
    originalInput: input,
    cleanedInput,
    inputType,
    searchIntent,
    recognizedAs: recognizedAs(inputType, detected.all, social.platform),
    convertedClaim,
    entities,
    categories,
    hints,
    isVague: quality.isVague,
    isOpinion: quality.isOpinion,
  };
}

function classifyIntent(raw: string, inputType: SourceMeshInputType): SourceMeshUnderstanding["searchIntent"] {
  if (inputType === "social-url") return "social-check";
  if (inputType === "domain" || inputType === "article-url") return "source-check";
  if (["health-claim", "legal-court-claim", "crime-local-claim"].includes(inputType)) return "legal-medical-caution";
  if (/\b(debate|pro con|argue|argument|rebuttal|cross[- ]?examination)\b/i.test(raw)) return "debate-prep";
  if (/\b(define|definition|what does|what is|explain|context|why is .* controversial)\b/i.test(raw)) return "definition";
  if (/\b(best articles|articles about|longform|analysis pieces|opinion pieces)\b/i.test(raw)) return "article-finder";
  if (/\b(compare|versus|vs\.?|framing differences|both sides)\b/i.test(raw)) return "compare";
  if (/\b(report|deep research|timeline|overview|research packet)\b/i.test(raw)) return "research-report";
  return "fact-check";
}

export function generateSearchVariants(understanding: SourceMeshUnderstanding): string[] {
  const base = understanding.convertedClaim || understanding.cleanedInput;
  const tokens = keywords(base);
  const variants: string[] = [base, ...intentRewrites(base, understanding)];

  if (tokens.length >= 2) variants.push(tokens.join(" "));
  if (understanding.entities.length > 0) variants.push(`${understanding.entities.slice(0, 3).join(" ")} ${tokens.slice(0, 5).join(" ")}`.trim());

  const categoryWords = categoryTerms(understanding.categories);
  for (const word of categoryWords) {
    const entityPrefix = understanding.entities.slice(0, 2).join(" ");
    variants.push(`${entityPrefix ? entityPrefix + " " : ""}${tokens.slice(0, 5).join(" ")} ${word}`.trim());
  }

  for (const [term, alts] of Object.entries(SYNONYMS)) {
    if (base.toLowerCase().includes(term)) {
      for (const alt of alts) variants.push(base.replace(new RegExp(term, "ig"), alt));
    }
  }

  if (understanding.inputType === "social-url" && understanding.entities.length > 0) {
    variants.push(`${understanding.entities.slice(0, 2).join(" ")} claim fact check`);
  }

  return unique(variants)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v) => v.length >= 3)
    .slice(0, 14);
}

function classifyInput(
  raw: string,
  mode: ReturnType<typeof detectMode>,
  isSocial: boolean,
  primary: ClaimCategory,
  isVague: boolean,
  isOpinion: boolean
): SourceMeshInputType {
  if (isOpinion) return "opinion-not-fact-checkable";
  if (isSocial) return "social-url";
  if (mode === "url") return "article-url";
  if (mode === "domain") return "domain";
  if (isScreenshotText(raw)) return "screenshot-text";
  if (/\b(deepfake|ai generated|voice clone|synthetic media|edited video)\b/i.test(raw)) return "ai-deepfake-claim";
  if (/\b(scam|fraud|crypto|bank|stock|investment|giveaway|sweepstake|lottery)\b/i.test(raw)) return "finance-scam-claim";
  if (/\b(arrest|murder|shooting|police|crime|missing|local)\b/i.test(raw)) return "crime-local-claim";
  if (primary === "health-medical") return "health-claim";
  if (primary === "politics-news") return "political-claim";
  if (primary === "science-research") return "science-research-claim";
  if (primary === "legal-court") return "legal-court-claim";
  if (primary === "celebrity-viral") return "celebrity-person-claim";
  if (isVague || /\?$/.test(raw.trim())) return "vague-question";
  return "normal-claim";
}

function cleanup(raw: string): string {
  const trimmed = raw.trim();
  const social = detectSocialUrl(trimmed);
  if (social.isSocial) return social.canonicalUrl;
  const mode = detectMode(trimmed);
  if (mode === "url") return normalizeUrl(trimmed).url;
  if (mode === "domain") return normalizeDomain(trimmed);
  let out = normalizeClaim(trimmed);
  for (const [pattern, replacement] of TYPO_NORMALIZATIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function questionToClaim(text: string): string {
  return text
    .replace(/^\s*(is|are|was|were|did|does|do|can|could|has|have|should|would)\s+/i, "")
    .replace(/^\s*(what'?s|whats|what is|explain|define|context for|articles about|best articles about)\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/\b(is|are) (that|this) (thing|claim) about\b/i, "")
    .replace(/\b(the|that|this) thing about\b/i, "")
    .trim();
}

function refineCategories(categories: ClaimCategory[], inputType: SourceMeshInputType, text: string): ClaimCategory[] {
  const out = new Set<ClaimCategory>(categories);
  if (/\b(lottery|giveaway|sweepstakes|illegal|lawsuit|court|charged)\b/i.test(text)) out.add("legal-court");
  if (/\b(lottery|giveaway|sweepstakes|scam|fraud|consumer alert|ftc)\b/i.test(text)) out.add("finance-business");
  if (/\b(MrBeast|celebrity|influencer|viral|TikTok|YouTube|Instagram)\b/i.test(text)) out.add("celebrity-viral");
  if (inputType === "ai-deepfake-claim") out.add("technology");
  out.add("general");
  return Array.from(out);
}

function intentRewrites(base: string, understanding: SourceMeshUnderstanding): string[] {
  const rewrites: string[] = [];
  const entities = understanding.entities.filter((e) => !/^(The|This|That)$/i.test(e));
  const subject = entities[0] ?? importantSubject(base);

  if (subject && /\b(lottery|giveaway|sweepstakes)\b/i.test(base)) {
    rewrites.push(`${subject} giveaway controversy`);
    rewrites.push(`${subject} sweepstakes legality`);
    rewrites.push(`${subject} lottery allegations`);
    rewrites.push(`FTC giveaway rules ${subject}`);
    rewrites.push(`${subject} legal controversy`);
  }

  if (subject && /\b(scam|fraud)\b/i.test(base)) {
    rewrites.push(`${subject} scam warning`);
    rewrites.push(`${subject} FTC consumer alert`);
    rewrites.push(`${subject} fraud allegations`);
  }

  if (subject && /\b(deepfake|AI generated|voice clone|synthetic)\b/i.test(base)) {
    rewrites.push(`${subject} deepfake analysis`);
    rewrites.push(`${subject} synthetic media verification`);
    rewrites.push(`${subject} original video source`);
  }

  if (understanding.inputType === "vague-question" && subject) {
    rewrites.push(`${subject} fact check`);
    rewrites.push(`${subject} controversy evidence`);
  }

  return rewrites;
}

function importantSubject(text: string): string {
  const proper = properEntities(text).find((entity) => !/^(What|This|That|The)$/i.test(entity));
  if (proper) return proper;
  const tokens = keywords(text);
  return tokens.slice(0, 2).join(" ");
}

function extractHints(text: string): SourceMeshUnderstanding["hints"] {
  const dates: string[] = text.match(/\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*(?:19|20)\d{2})?/gi) ?? [];
  const locations: string[] = text.match(/\b(?:in|near|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g)?.map((s) => s.replace(/^(in|near|at)\s+/i, "")) ?? [];
  const orgs: string[] = text.match(/\b(?:FDA|CDC|NIH|NASA|SEC|FTC|DOJ|FBI|WHO|EU|UN|BLS|Census|OpenAI|Google|Meta|YouTube|TikTok|Instagram|Facebook|Reddit)\b/g) ?? [];
  const people: string[] = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) ?? [];
  return {
    dates: unique(dates),
    locations: unique(locations),
    people: unique(people.filter((p) => !orgs.includes(p))),
    organizations: unique(orgs),
    sourceTargets: inferSourceTargets(text),
  };
}

function properEntities(text: string): string[] {
  return text.match(/\b[A-Z][A-Za-z0-9]*(?:[ -][A-Z][A-Za-z0-9]*){0,3}\b/g) ?? [];
}

function inferSourceTargets(text: string): string[] {
  const targets: string[] = [];
  if (/\b(court|lawsuit|illegal|charged|indicted|ruling)\b/i.test(text)) targets.push("court records", "official legal filings");
  if (/\b(vaccine|disease|cure|drug|health|cancer)\b/i.test(text)) targets.push("CDC/FDA/NIH/PubMed");
  if (/\b(stock|sec|crypto|scam|fraud|investment)\b/i.test(text)) targets.push("SEC/FTC releases", "business news");
  if (/\b(study|research|paper|science)\b/i.test(text)) targets.push("PubMed/arXiv/OpenAlex/Crossref");
  if (/\b(viral|tiktok|instagram|youtube|x|twitter|facebook|reddit)\b/i.test(text)) targets.push("fact-checkers", "news coverage", "platform public metadata");
  return unique(targets);
}

function categoryTerms(categories: ClaimCategory[]): string[] {
  const terms: Partial<Record<ClaimCategory, string[]>> = {
    "legal-court": ["lawsuit", "court filing", "legal issue"],
    "health-medical": ["FDA", "CDC", "study"],
    "finance-business": ["FTC", "SEC", "consumer alert"],
    "celebrity-viral": ["allegations", "controversy", "fact check"],
    "politics-news": ["fact check", "official statement", "news"],
    "science-research": ["study", "research paper", "peer reviewed"],
    technology: ["technical report", "security advisory", "AI"],
  };
  return unique(categories.flatMap((c) => terms[c] ?? []));
}

function keywords(text: string): string[] {
  return unique(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  ).slice(0, 10);
}

function isScreenshotText(raw: string): boolean {
  return raw.length > 140 && /\b(screenshot|caption|post says|image says|text says)\b/i.test(raw);
}

function recognizedAs(type: SourceMeshInputType, categories: ClaimCategory[], platform: string): string {
  if (type === "social-url") return `public ${platform} social URL with possible claim context`;
  if (type === "vague-question") return `possible ${categories.filter((c) => c !== "general").join("/") || "general"} claim, but vague`;
  if (type === "opinion-not-fact-checkable") return "opinion or value judgment; evidence search can only find context";
  return type.replace(/-/g, " ");
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}
