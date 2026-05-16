/**
 * Detect claim-quality issues that should TEMPER the verdict, not change it.
 *
 *  - vagueness        — too short, too generic, or all-stopword
 *  - opinion-based    — "I think", "best", "should", subjective adjectives
 *  - future prediction — "will", "going to", future-year references
 *  - expert needed    — medical / legal / financial terms requiring professional interpretation
 *
 * Each detection emits a SafetyWarning with id + text + tone.
 * These are surfaced alongside (never overriding) the evidence-based verdict.
 */

export type SafetyWarningId =
  | "single-source"
  | "unknown-publisher"
  | "vague-claim"
  | "opinion-claim"
  | "future-prediction"
  | "needs-expert"
  | "evidence-stale"
  | "sources-disagree"
  | "fact-check-unavailable"
  | "demoted-stance-majority";

export interface SafetyWarning {
  id: SafetyWarningId;
  text: string;
  tone: "warn" | "bad" | "neutral";
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","should","could","may","might","must",
  "this","that","these","those","i","you","he","she","it","we","they","them","their","there",
  "to","of","in","on","at","by","for","with","about","against","between","into","through",
  "as","than","too","very","just","not","no","nor","only","also","more","most","some","any",
]);

const OPINION_MARKERS = [
  /\bi (?:think|believe|feel|guess|reckon|suspect)\b/i,
  /\bin my (?:opinion|view|estimation|book)\b/i,
  /\b(?:imho|imo|tbh|fwiw)\b/i,
  /\bit (?:seems|feels|appears) (?:to me|like)\b/i,
];

const OPINION_ADJECTIVES = [
  "best","worst","greatest","terrible","amazing","awful","beautiful","ugly","brilliant",
  "stupid","wonderful","horrible","fantastic","incredible","disgusting","perfect","awesome",
  "lame","cool","weird","creepy","cute","gross","fascinating","boring","exciting",
];

const NORMATIVE_MARKERS = [
  /\bshould\b/i, /\bought to\b/i, /\bmust\b/i, /\bneed to\b/i,
  /\bit'?s wrong\b/i, /\bit'?s right\b/i, /\bdeserves?\b/i,
];

const FUTURE_MARKERS = [
  /\bwill\b/i,
  /\bgoing to\b/i,
  /\babout to\b/i,
  /\bsoon\b/i,
  /\bnext (?:year|month|week|decade|century)\b/i,
  /\bby \d{4}\b/i,            // "by 2030"
  /\bin \d+ (?:years|months|weeks|days)\b/i,
];

const MEDICAL_TERMS = [
  /\b(?:cancer|tumor|disease|diagnosis|treatment|therapy|dosage|prescription)\b/i,
  /\b(?:drug|medication|vaccine|antibiotic|antiviral|chemotherapy)\b/i,
  /\b(?:symptom|side[- ]?effect|contraindication|overdose)\b/i,
  /\b(?:cure[s]?|heals?|reverses|prevents)\b.{0,30}\b(?:disease|illness|cancer)\b/i,
];

const LEGAL_TERMS = [
  /\b(?:lawsuit|sued|prosecut(?:e|ed|ion)|indict(?:ed|ment)|convict(?:ed|ion))\b/i,
  /\b(?:statute|ruling|verdict|injunction|subpoena|deposition)\b/i,
  /\b(?:constitutional|unconstitutional|jurisdiction|precedent)\b/i,
  /\b(?:guilty|innocent|acquitted|defendant|plaintiff)\b/i,
];

const FINANCIAL_TERMS = [
  /\b(?:invest|investing|stock|stocks|shares|bond|bonds|crypto|bitcoin|ethereum)\b/i,
  /\b(?:buy|sell|short)\s+(?:stock|shares|crypto|the market)\b/i,
  /\b(?:return on investment|roi|portfolio|hedge|derivative)\b/i,
];

export interface ClaimQualityResult {
  warnings: SafetyWarning[];
  isVague: boolean;
  isOpinion: boolean;
  isFuturePrediction: boolean;
  needsExpert: "medical" | "legal" | "financial" | null;
}

export function analyzeClaimQuality(rawClaim: string): ClaimQualityResult {
  const warnings: SafetyWarning[] = [];
  const text = rawClaim.trim();
  const lower = text.toLowerCase();

  // VAGUENESS
  const contentTokens = lower
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  const isVague = text.length < 15 || contentTokens.length < 3;
  if (isVague) {
    warnings.push({
      id: "vague-claim",
      tone: "warn",
      text: "Claim is short or generic. A more specific claim with names, dates, or numbers gets better search results.",
    });
  }

  // OPINION
  let isOpinion = false;
  for (const re of OPINION_MARKERS) {
    if (re.test(text)) { isOpinion = true; break; }
  }
  if (!isOpinion) {
    for (const re of NORMATIVE_MARKERS) {
      if (re.test(text)) { isOpinion = true; break; }
    }
  }
  if (!isOpinion) {
    const adjHits = OPINION_ADJECTIVES.filter((a) => new RegExp(`\\b${a}\\b`, "i").test(text));
    if (adjHits.length >= 2) isOpinion = true;
  }
  if (isOpinion) {
    warnings.push({
      id: "opinion-claim",
      tone: "warn",
      text: "Claim contains opinion-style or normative language ('best', 'should', 'I think'). Fact-checking applies only to factual assertions, not value judgments.",
    });
  }

  // FUTURE PREDICTION
  let isFuturePrediction = false;
  for (const re of FUTURE_MARKERS) {
    if (re.test(text)) { isFuturePrediction = true; break; }
  }
  // Year-in-the-future check
  if (!isFuturePrediction) {
    const yearMatches = text.match(/\b(20\d{2}|21\d{2})\b/g) ?? [];
    const thisYear = new Date().getUTCFullYear();
    if (yearMatches.some((y) => Number(y) > thisYear)) isFuturePrediction = true;
  }
  if (isFuturePrediction) {
    warnings.push({
      id: "future-prediction",
      tone: "warn",
      text: "Claim refers to a future event. Predictions cannot be verified by current evidence — only the underlying assumptions can.",
    });
  }

  // EXPERT NEEDED
  let needsExpert: ClaimQualityResult["needsExpert"] = null;
  if (MEDICAL_TERMS.some((re) => re.test(text))) {
    needsExpert = "medical";
    warnings.push({
      id: "needs-expert",
      tone: "bad",
      text: "Claim involves medical/health topics. This tool is not a substitute for advice from a licensed clinician.",
    });
  } else if (LEGAL_TERMS.some((re) => re.test(text))) {
    needsExpert = "legal";
    warnings.push({
      id: "needs-expert",
      tone: "bad",
      text: "Claim involves legal topics. This tool is not a substitute for advice from a licensed attorney.",
    });
  } else if (FINANCIAL_TERMS.some((re) => re.test(text))) {
    needsExpert = "financial";
    warnings.push({
      id: "needs-expert",
      tone: "bad",
      text: "Claim involves financial topics. This tool is not investment advice; consult a licensed advisor for decisions.",
    });
  }

  return { warnings, isVague, isOpinion, isFuturePrediction, needsExpert };
}
