import { normalizeClaim } from "./normalize";

export interface SearchVariant {
  label: string;        // "original", "keywords", "focused", ...
  query: string;        // the string to send to the upstream API
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","should","could","may","might","must",
  "this","that","these","those","i","you","he","she","it","we","they","them","their","there",
  "to","of","in","on","at","by","for","with","about","against","between","into","through",
  "during","before","after","above","below","from","up","down","out","off","over","under",
  "again","further","then","once","so","than","too","very","just","not","no","nor","only",
  "as","also","more","most","some","any","all","each","few","both","such","own","same",
  "really","actually","probably","basically","literally","like","get","got","getting",
]);

// High-signal tokens — when present, they're worth keeping even if short.
const RARE_BOOSTERS = new Set([
  "ai","fda","cdc","nih","epa","sec","irs","gop","usa","eu","un","who",
  "covid","cancer","autism","vaccine","measles","ebola","hiv","aids",
  "russia","ukraine","gaza","israel","china","taiwan","iran","syria",
  "biden","trump","putin","xi","modi","macron","milei",
  "nasa","spacex","moon","mars","saturn","jupiter","earth","alien",
  "bitcoin","crypto","ethereum","tesla","openai","google","amazon","apple",
  "supreme","court","congress","senate","house","ruling","verdict",
]);

const SYNONYMS: Record<string, string[]> = {
  "global warming":      ["climate change"],
  "climate change":      ["global warming"],
  "vaccine":             ["vaccination", "vaccinated", "jab"],
  "vaccination":         ["vaccine"],
  "covid":               ["coronavirus", "covid-19", "sars-cov-2"],
  "coronavirus":         ["covid", "covid-19"],
  "moon landing":        ["apollo 11", "lunar landing"],
  "ai":                  ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  "ufo":                 ["uap", "unidentified aerial phenomena"],
  "uap":                 ["ufo"],
};

interface Token {
  raw: string;        // original-case
  lower: string;
  score: number;      // distinctiveness heuristic
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  // Word characters plus apostrophes; keep numbers
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
  for (const raw of matches) {
    const lower = raw.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (lower.length < 2) continue;
    let score = 1;
    if (lower.length >= 6) score += 1;
    if (lower.length >= 9) score += 1;
    if (/^[A-Z]/.test(raw)) score += 2;          // Proper noun in source
    if (/^\d/.test(raw)) score += 1;             // Number / year
    if (RARE_BOOSTERS.has(lower)) score += 3;
    tokens.push({ raw, lower, score });
  }
  return tokens;
}

function uniqueByLower(tokens: Token[]): Token[] {
  const seen = new Set<string>();
  const out: Token[] = [];
  for (const t of tokens) {
    if (seen.has(t.lower)) continue;
    seen.add(t.lower);
    out.push(t);
  }
  return out;
}

/**
 * Try to extract a contiguous quoted phrase from the claim that contains
 * 2-4 high-signal tokens. Useful for forcing exact-match queries.
 */
function extractKeyPhrase(text: string, distinctTokens: Set<string>): string | null {
  const words = text.split(/\s+/);
  let best: { start: number; end: number; score: number } | null = null;
  for (let i = 0; i < words.length; i++) {
    let score = 0;
    let hit = 0;
    for (let len = 2; len <= 4 && i + len <= words.length; len++) {
      const slice = words.slice(i, i + len);
      score = 0;
      hit = 0;
      for (const w of slice) {
        const lower = w.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, "");
        if (distinctTokens.has(lower)) { score += 1; hit++; }
      }
      if (hit >= 2 && (!best || score > best.score)) {
        best = { start: i, end: i + len, score };
      }
    }
  }
  if (!best) return null;
  return words.slice(best.start, best.end).join(" ").replace(/[^\p{L}\p{N}'\s-]/gu, "").trim();
}

export function expandQuery(rawClaim: string): SearchVariant[] {
  const cleaned = normalizeClaim(rawClaim).replace(/[?!.,;:]+$/g, "");
  const variants: SearchVariant[] = [];

  // 1. Original
  if (cleaned.length > 0) {
    variants.push({ label: "original", query: cleaned.slice(0, 280) });
  }

  const tokens = tokenize(cleaned);
  const distinct = uniqueByLower(tokens);

  // 2. Keywords (stopwords removed, capped)
  const keywordsArr = distinct.slice(0, 14).map((t) => t.lower);
  const keywordsStr = keywordsArr.join(" ");
  if (keywordsStr && keywordsStr !== cleaned.toLowerCase()) {
    variants.push({ label: "keywords", query: keywordsStr });
  }

  // 3. Focused (top 5 by score)
  const focused = [...distinct]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((t) => t.lower);
  if (focused.length >= 2) {
    const focusedStr = focused.join(" ");
    if (focusedStr !== keywordsStr) {
      variants.push({ label: "focused", query: focusedStr });
    }
  }

  // 4. Quoted key phrase
  const distinctSet = new Set(distinct.map((t) => t.lower));
  const phrase = extractKeyPhrase(cleaned, distinctSet);
  if (phrase && phrase.split(" ").length >= 2) {
    variants.push({ label: "phrase", query: `"${phrase}"` });
  }

  // 5. Synonym expansion — at most one extra variant
  const lowerCleaned = cleaned.toLowerCase();
  for (const key of Object.keys(SYNONYMS)) {
    if (lowerCleaned.includes(key)) {
      for (const alt of SYNONYMS[key]) {
        const swapped = lowerCleaned.replace(key, alt);
        if (swapped !== lowerCleaned && !variants.some((v) => v.query === swapped)) {
          variants.push({ label: "synonym", query: swapped.slice(0, 280) });
          break;
        }
      }
      break;
    }
  }

  // Deduplicate; cap at 5
  const seen = new Set<string>();
  const out: SearchVariant[] = [];
  for (const v of variants) {
    const k = v.query.trim().toLowerCase();
    if (k.length === 0 || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= 5) break;
  }
  return out;
}
