import type { CheckMode } from "./types";

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","should","could","may","might","must",
  "this","that","these","those","i","you","he","she","it","we","they","them","their","there",
  "to","of","in","on","at","by","for","with","about","against","between","into","through",
  "during","before","after","above","below","from","up","down","out","off","over","under",
  "again","further","then","once","so","than","too","very","just","not","no","nor","only",
]);

export function normalizeClaim(raw: string): string {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildClaimQuery(claim: string): string {
  // Drop trailing punctuation and limit length for query APIs
  const cleaned = normalizeClaim(claim).replace(/[?!.,;:]+$/g, "");

  // If short enough, send as-is
  if (cleaned.length <= 200) return cleaned;

  // Otherwise extract the most signal-rich words
  const words = cleaned
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  // Keep distinct words in original order
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      keywords.push(w);
    }
    if (keywords.length >= 12) break;
  }
  return keywords.join(" ");
}

export function normalizeUrl(raw: string): { url: string; domain: string } {
  let cleaned = raw.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = "https://" + cleaned;
  }
  try {
    const u = new URL(cleaned);
    return {
      url: u.toString(),
      domain: u.hostname.replace(/^www\./i, "").toLowerCase(),
    };
  } catch {
    return { url: raw, domain: extractRawDomain(raw) };
  }
}

export function normalizeDomain(raw: string): string {
  return extractRawDomain(raw);
}

function extractRawDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[\/\?#]/)[0]
    .trim();
}

export function normalize(mode: CheckMode, raw: string): string {
  switch (mode) {
    case "claim":  return normalizeClaim(raw);
    case "url":    return normalizeUrl(raw).url;
    case "domain": return normalizeDomain(raw);
  }
}
