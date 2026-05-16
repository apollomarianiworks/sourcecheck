import rules from "@/data/source-rules.json";
import type { SourceCategory } from "./categories";

export interface SourceRule {
  domain: string;
  category: SourceCategory;
  rawCategory: string;          // the string as it appears in source-rules.json
  baseQualityScore: number;
  notes: string;
  warningFlags: string[];
  preferredUse: string;
}

export interface TldRule {
  bonus: number;
  category: SourceCategory | null;
  notes: string;
}

export interface WarningFlagMeta {
  tone: "good" | "neutral" | "warn" | "bad";
  label: string;
}

/**
 * Categories used in source-rules.json are user-facing strings (e.g.
 * "official-government", "established-news"). Internally the rest of the app
 * uses the SourceCategory type defined in categories.ts. This map normalizes
 * one to the other so we don't fragment the codebase.
 */
const CATEGORY_MAP: Record<string, SourceCategory> = {
  "official-government":   "government",
  "court-legal":           "court-legal",
  "academic-research":     "academic",
  "medical-science":       "medical-science",
  "established-news":      "mainstream-news",
  "local-news":            "local-news",
  "advocacy":              "advocacy",
  "fact-checker":          "fact-checker",
  "encyclopedia":          "encyclopedia",
  "satire":                "satire",
  "tabloid":               "tabloid",
  "conspiracy":            "conspiracy",
  "blog":                  "blog",
  "user-generated-social": "social-media",
  "unknown":               "unknown",
};

function normalizeCategory(raw: string): SourceCategory {
  return CATEGORY_MAP[raw] ?? "unknown";
}

interface RawRule {
  domain: string;
  category: string;
  baseQualityScore: number;
  notes: string;
  warningFlags: string[];
  preferredUse: string;
}

interface RawTld {
  bonus: number;
  category: string | null;
  notes: string;
}

const rawSources = (rules as { sources: Record<string, RawRule> }).sources;
const rawTlds    = (rules as { tldRules: Record<string, RawTld> }).tldRules;
const warningMeta = (rules as { warningFlagMeta: Record<string, WarningFlagMeta> }).warningFlagMeta;

// Build the normalized lookup once at module load
const SOURCE_LOOKUP: Record<string, SourceRule> = {};
for (const [domain, r] of Object.entries(rawSources)) {
  SOURCE_LOOKUP[domain.toLowerCase()] = {
    domain: r.domain,
    category: normalizeCategory(r.category),
    rawCategory: r.category,
    baseQualityScore: r.baseQualityScore,
    notes: r.notes,
    warningFlags: r.warningFlags ?? [],
    preferredUse: r.preferredUse ?? "",
  };
}

const TLD_LOOKUP: Record<string, TldRule> = {};
for (const [tld, t] of Object.entries(rawTlds)) {
  TLD_LOOKUP[tld.toLowerCase()] = {
    bonus: t.bonus,
    category: t.category ? normalizeCategory(t.category) : null,
    notes: t.notes,
  };
}

export function lookupSource(domain: string): SourceRule | null {
  const clean = domain.toLowerCase().replace(/^www\./, "");
  if (SOURCE_LOOKUP[clean]) return SOURCE_LOOKUP[clean];

  // Try parent domain (sub.example.com → example.com)
  const labels = clean.split(".");
  if (labels.length > 2) {
    const parent = labels.slice(-2).join(".");
    if (SOURCE_LOOKUP[parent]) return SOURCE_LOOKUP[parent];
  }
  return null;
}

export function lookupTld(domain: string): { tld: string; rule: TldRule } | null {
  const clean = domain.toLowerCase();
  for (const tld of Object.keys(TLD_LOOKUP)) {
    if (clean.endsWith(tld)) {
      return { tld, rule: TLD_LOOKUP[tld] };
    }
  }
  return null;
}

export function describeFlag(flag: string): WarningFlagMeta {
  return (
    warningMeta[flag] ?? {
      tone: "neutral",
      label: flag,
    }
  );
}

export function allRuleDomains(): string[] {
  return Object.keys(SOURCE_LOOKUP);
}

export function ruleCount(): number {
  return Object.keys(SOURCE_LOOKUP).length;
}
