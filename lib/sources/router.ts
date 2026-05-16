import type { ClaimCategory } from "./types";

/**
 * Rule-based claim category detection. Returns 1-2 categories ordered by
 * strongest match first. "general" is always included as a fallback so we
 * always run the general adapters (GDELT/Wikipedia/Fact Check).
 */

interface CategoryRule {
  category: ClaimCategory;
  patterns: RegExp[];
  /** Boost when a pattern matches in the first 30 chars of the claim. */
  weight?: number;
}

const RULES: CategoryRule[] = [
  {
    category: "health-medical",
    patterns: [
      /\b(?:cancer|tumor|disease|symptom|infection|virus|bacteria|epidemic|pandemic)\b/i,
      /\b(?:vaccine|vaccin\w*|immuniz|antibody|antibiotic|antiviral)\b/i,
      /\b(?:drug|medication|prescription|dosage|overdose|opioid|fentanyl)\b/i,
      /\b(?:fda|cdc|nih|who\b|nhs|hospital|clinic|doctor|physician|surgeon|patient)\b/i,
      /\b(?:diabetes|asthma|alzheimer|covid|hiv|aids|ebola|measles|chickenpox)\b/i,
      /\b(?:treatment|therapy|cure|prevention|side[- ]?effect)\b/i,
    ],
  },
  {
    category: "science-research",
    patterns: [
      /\b(?:study|stud(?:ies|y)|research(?:ers?)?|scientist(?:s)?|laboratory|lab\b)\b/i,
      /\b(?:paper|journal|peer[- ]?review(?:ed)?|preprint|arxiv|biorxiv)\b/i,
      /\b(?:theory|hypothesis|experiment|empirical|findings?|peer-reviewed)\b/i,
      /\b(?:physics|chemistry|biology|astronomy|geology|neuroscience|genomic|genome)\b/i,
      /\b(?:climate change|global warming|carbon emission|greenhouse gas)\b/i,
      /\b(?:nasa|esa|jpl|mit|stanford|harvard|caltech|cern)\b/i,
    ],
  },
  {
    category: "legal-court",
    patterns: [
      /\b(?:supreme court|federal court|appellate|appeals court|district court)\b/i,
      /\b(?:rul(?:ed|ing|es)|verdict|injunction|subpoena|deposition|opinion)\b/i,
      /\b(?:lawsuit|sued|plaintiff|defendant|attorney|prosecut\w+|indict\w+|convict\w+|guilty|acquit\w+)\b/i,
      /\b(?:statute|legislation|bill|amendment|constitution(?:al)?|unconstitutional)\b/i,
      /\b(?:doj|justice department|fbi|circuit court|chief justice)\b/i,
      /\b(?:dissent|majority opinion|amicus brief|stare decisis|jurisdiction|precedent)\b/i,
    ],
  },
  {
    category: "finance-business",
    patterns: [
      /\b(?:stock|stocks|equity|share price|earnings|ipo|spac)\b/i,
      /\b(?:invest(?:or|ment|ing)?|portfolio|hedge fund|venture capital|vc\b)\b/i,
      /\b(?:sec\b|cftc|frb|federal reserve|interest rate|inflation|recession|gdp)\b/i,
      /\b(?:bank|banking|mortgage|loan|credit|debt|bond|treasury)\b/i,
      /\b(?:crypto(?:currency)?|bitcoin|ethereum|btc|eth|blockchain)\b/i,
      /\b(?:earnings call|10[- ]k|10[- ]q|annual report|guidance|valuation)\b/i,
      /\b(?:scam|fraud|giveaway|sweepstakes?|lotter(?:y|ies)|consumer alert|ftc)\b/i,
    ],
  },
  {
    category: "technology",
    patterns: [
      /\b(?:ai\b|artificial intelligence|machine learning|llm|gpt\b|openai|anthropic|claude|gemini)\b/i,
      /\b(?:algorithm|model|training|inference|fine[- ]?tun(?:e|ing))\b/i,
      /\b(?:startup|founder|unicorn|series [a-d]\b|seed round)\b/i,
      /\b(?:google|alphabet|apple|meta|microsoft|amazon|nvidia|tesla|spacex)\b/i,
      /\b(?:cybersecurity|data breach|vulnerability|cve|zero[- ]day|ransomware)\b/i,
      /\b(?:silicon valley|y combinator|techcrunch|hacker news)\b/i,
    ],
  },
  {
    category: "politics-news",
    patterns: [
      /\b(?:election|vote(?:r|d)?|voting|ballot|polling|poll(?:s)?)\b/i,
      /\b(?:president|congress|senate|house of representatives|representative|senator|governor)\b/i,
      /\b(?:republican|democrat|gop\b|dnc\b|rnc\b)\b/i,
      /\b(?:biden|trump|harris|obama|clinton|sanders|vance|newsom|desantis)\b/i,
      /\b(?:legislation|executive order|veto|filibuster|impeachment|cabinet)\b/i,
      /\b(?:nato|un\b|united nations|eu\b|european union|brexit|tariff)\b/i,
    ],
  },
  {
    category: "celebrity-viral",
    patterns: [
      /\b(?:viral|tiktok|twitter|instagram|youtube|reddit|facebook|threads|bluesky)\b/i,
      /\b(?:celebrity|celeb|influencer|hoax|rumor|gossip)\b/i,
      /\b(?:mrbeast|mr beast|taylor swift|kim kardashian|kanye|beyonce|drake|elon musk\b)\b/i,
    ],
  },
];

const NEAR_START_BONUS = 1;

interface CategoryScore {
  category: ClaimCategory;
  score: number;
  matched: string[];
}

export function detectCategory(claim: string): { primary: ClaimCategory; all: ClaimCategory[]; details: CategoryScore[] } {
  const text = claim ?? "";
  const scores: CategoryScore[] = [];

  for (const rule of RULES) {
    let s = 0;
    const matched: string[] = [];
    for (const re of rule.patterns) {
      const m = text.match(re);
      if (m) {
        s += 1;
        matched.push(m[0]);
        if (text.toLowerCase().indexOf(m[0].toLowerCase()) < 30) s += NEAR_START_BONUS;
      }
    }
    if (s > 0) scores.push({ category: rule.category, score: s, matched });
  }

  scores.sort((a, b) => b.score - a.score);

  const primary: ClaimCategory = scores[0]?.category ?? "general";
  const all: ClaimCategory[] = scores.length === 0
    ? ["general"]
    : Array.from(new Set([primary, ...scores.slice(1, 3).map((s) => s.category), "general" as ClaimCategory]));

  return { primary, all, details: scores };
}

/**
 * Per-category adapter priorities. Returned in selection order.
 * "general" pool always runs alongside whichever category is selected.
 *
 * Adapter ids are referenced — they must match `lib/sources/index.ts`.
 */
export const ADAPTERS_BY_CATEGORY: Record<ClaimCategory, string[]> = {
  "general":          ["googleFactCheck", "gdelt", "wikimedia", "rss", "brave", "newsdata", "mediastack"],
  "politics-news":    ["googleFactCheck", "gdelt", "rss", "wikimedia", "brave", "newsdata", "mediastack"],
  "health-medical":   ["pubmed", "semanticScholar", "googleFactCheck", "gdelt", "rss", "wikimedia", "newsdata"],
  "science-research": ["semanticScholar", "arxiv", "openalex", "crossref", "wikimedia", "gdelt", "github"],
  "legal-court":      ["courtlistener", "googleFactCheck", "gdelt", "wikimedia"],
  "finance-business": ["rss", "gdelt", "googleFactCheck", "wikimedia", "brave", "newsdata", "mediastack"],
  "technology":       ["github", "stackexchange", "hackernews", "semanticScholar", "arxiv", "gdelt", "wikimedia", "brave"],
  "celebrity-viral":  ["googleFactCheck", "gdelt", "reddit", "wikimedia", "rss", "brave", "newsdata"],
};

/** Build the full adapter id list for a claim, deduped and ordered. */
export function adaptersForClaim(categories: ClaimCategory[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    for (const id of ADAPTERS_BY_CATEGORY[cat] ?? []) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}
