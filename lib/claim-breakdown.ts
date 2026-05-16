/**
 * Heuristic claim parser. NOT a real NLP system — just exposes the
 * salient parts of the user's claim so they can see what was actually
 * being checked.
 */

export interface ClaimPart {
  label: string;
  value: string;
}

export interface ClaimBreakdown {
  raw: string;
  entities: string[];           // Capitalized multi-word phrases ("New York Times", "NASA")
  numbers: string[];            // "73%", "1969", "$5 million"
  dates: string[];              // anything that looks like a year, month, or date phrase
  quantifiers: string[];        // "all", "most", "every", "no", "none", "dozens of"
  comparators: string[];        // "more than", "less than", "greater than"
  hasNegation: boolean;
  hasHedging: boolean;          // "allegedly", "reportedly", "may have"
  parts: ClaimPart[];           // ordered list for UI display
}

const QUANTIFIERS = [
  "all", "every", "each", "any", "none", "no",
  "most", "many", "several", "some", "few",
  "dozens of", "hundreds of", "thousands of", "millions of", "billions of",
  "the majority of", "a minority of", "a handful of",
];

const COMPARATORS = [
  "more than", "less than", "greater than", "fewer than",
  "as many as", "at least", "at most", "up to", "over", "under",
];

const HEDGES = [
  "allegedly", "reportedly", "may have", "might have", "could have",
  "supposedly", "rumored", "claimed", "appears to", "seems to",
];

const NEGATION_RE = /\b(no|not|n['']t|never|none|neither|nothing|nobody|cannot|can['']t|isn['']t|aren['']t|wasn['']t|weren['']t|doesn['']t|didn['']t|won['']t|wouldn['']t|shouldn['']t|couldn['']t)\b/i;

const MONTHS_RE = /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i;

export function breakdownClaim(rawInput: string): ClaimBreakdown {
  const raw = rawInput.trim();
  const lower = raw.toLowerCase();
  const parts: ClaimPart[] = [];

  // Entities: sequences of Capitalized words, capped to 4 words
  const entities = extractEntities(raw);

  // Numbers and percentages, money, basic counts
  const numbers = uniq(matchAll(raw, /\b(?:\$?\d{1,3}(?:,\d{3})+|\$?\d+(?:\.\d+)?)\s?(?:%|percent|million|billion|trillion|m|bn)?\b/gi));

  // Dates: 4-digit years, ISO-ish dates, or month names with year
  const dateMatches: string[] = [];
  for (const m of matchAll(raw, /\b(19|20)\d{2}\b/g)) dateMatches.push(m);
  for (const m of matchAll(raw, /\b\d{4}-\d{2}-\d{2}\b/g)) dateMatches.push(m);
  for (const m of matchAll(raw, new RegExp(MONTHS_RE.source + "\\s+\\d{1,2}(?:,\\s*\\d{4})?", "gi"))) dateMatches.push(m);
  const dates = uniq(dateMatches);

  // Quantifiers
  const quantifiers: string[] = [];
  for (const q of QUANTIFIERS) {
    const re = new RegExp(`\\b${escapeRe(q)}\\b`, "i");
    if (re.test(lower)) quantifiers.push(q);
  }

  // Comparators
  const comparators: string[] = [];
  for (const c of COMPARATORS) {
    if (lower.includes(c)) comparators.push(c);
  }

  // Hedging
  let hasHedging = false;
  for (const h of HEDGES) {
    if (lower.includes(h)) { hasHedging = true; break; }
  }

  const hasNegation = NEGATION_RE.test(raw);

  // Build ordered display list
  if (entities.length > 0)    parts.push({ label: "Entities",    value: entities.join(", ") });
  if (numbers.length > 0)     parts.push({ label: "Numbers",     value: numbers.join(", ") });
  if (dates.length > 0)       parts.push({ label: "Dates",       value: dates.join(", ") });
  if (quantifiers.length > 0) parts.push({ label: "Quantifiers", value: quantifiers.join(", ") });
  if (comparators.length > 0) parts.push({ label: "Comparators", value: comparators.join(", ") });
  if (hasHedging)             parts.push({ label: "Hedging",     value: "language softens certainty" });
  if (hasNegation)            parts.push({ label: "Negation",    value: "claim contains a negation" });

  return {
    raw,
    entities,
    numbers,
    dates,
    quantifiers,
    comparators,
    hasNegation,
    hasHedging,
    parts,
  };
}

function extractEntities(text: string): string[] {
  const matches: string[] = [];
  // Greedy: 1-4 Capitalized words in a row, also catch ALL-CAPS acronyms
  const re = /\b(?:[A-Z][a-z'-]{1,}(?:\s+[A-Z][a-z'-]{1,}){0,3}|[A-Z]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const candidate = m[0].trim();
    // Skip common sentence-start words
    if (/^(The|A|An|This|That|These|Those|It|If|When|Where|Why|How|What)$/.test(candidate)) continue;
    if (candidate.length < 2) continue;
    matches.push(candidate);
  }
  return uniq(matches).slice(0, 8);
}

function matchAll(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push(m[0]);
  return out;
}

function uniq(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
