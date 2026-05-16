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
  "what","when","where","who","why","with",
]);

const SYNONYMS: Record<string, string[]> = {
  lottery: ["giveaway", "sweepstakes", "contest"],
  illegal: ["lawsuit", "legal issue", "FTC", "investigation"],
  scam: ["fraud", "consumer alert", "FTC warning"],
  fake: ["hoax", "false", "misleading"],
  deepfake: ["AI generated", "synthetic media", "voice clone"],
  cure: ["treatment", "clinical trial", "FDA warning"],
};

export function understandQuery(input: string): SourceMeshUnderstanding {
  const trimmed = input.trim();
  const mode = detectMode(trimmed);
  const social = detectSocialUrl(trimmed);
  const cleanedInput = cleanup(trimmed);
  const quality = analyzeClaimQuality(cleanedInput);
  const convertedClaim = questionToClaim(cleanedInput);
  const detected = detectCategory(convertedClaim);
  const inputType = classifyInput(trimmed, mode, social.isSocial, detected.primary, quality.isVague, quality.isOpinion);
  const hints = extractHints(convertedClaim);
  const entities = Array.from(new Set([...hints.people, ...hints.organizations, ...properEntities(convertedClaim)]));

  return {
    originalInput: input,
    cleanedInput,
    inputType,
    recognizedAs: recognizedAs(inputType, detected.all, social.platform),
    convertedClaim,
    entities,
    categories: detected.all,
    hints,
    isVague: quality.isVague,
    isOpinion: quality.isOpinion,
  };
}

export function generateSearchVariants(understanding: SourceMeshUnderstanding): string[] {
  const base = understanding.convertedClaim || understanding.cleanedInput;
  const tokens = keywords(base);
  const variants: string[] = [base];

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
    .slice(0, 10);
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
  return normalizeClaim(trimmed)
    .replace(/\bmr beast\b/gi, "MrBeast")
    .replace(/\btik tok\b/gi, "TikTok")
    .replace(/\btwitter\b/gi, "X Twitter");
}

function questionToClaim(text: string): string {
  return text
    .replace(/^\s*(is|are|was|were|did|does|do|can|could|has|have)\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/\b(is|are) (that|this) (thing|claim) about\b/i, "")
    .trim();
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
