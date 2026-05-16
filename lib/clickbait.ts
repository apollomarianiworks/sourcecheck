/**
 * Detect clickbait / emotionally manipulative language in titles & bodies.
 * Pattern-based, English-only. Returns a score (0-100, higher = more clickbaity)
 * and a list of triggered signals.
 */

const CURIOSITY_GAPS = [
  /you won['']t believe/i,
  /what happen(?:s|ed) next/i,
  /the (?:reason|real reason|truth) (?:why|behind)/i,
  /this one (?:weird|simple) trick/i,
  /doctors (?:hate|don['']t want)/i,
  /the (?:internet|world|nation) is (?:freaking out|going crazy|in shock)/i,
  /will (?:shock|stun|amaze) you/i,
  /\bnumber\s*\d+\s*will\b/i,
  /and\s+(?:no\.\s*\d+|number\s*\d+)/i,
  /can['']t (?:believe|even)/i,
];

const SENSATIONAL_WORDS = [
  /\b(?:shocking|stunning|jaw-?dropping|mind-?blowing|bombshell|explosive)\b/i,
  /\b(?:devastating|catastrophic|horrifying|terrifying)\b/i,
  /\b(?:destroyed|annihilated|obliterated|crushed|savaged|eviscerated)\b/i,
  /\b(?:slammed|blasted|roasted|torched|owned|schooled|dunked on)\b/i,
  /\b(?:breaks?\s+silence|finally\s+admits|caught\s+on\s+(?:camera|tape))\b/i,
  /\b(?:exposed|revealed|uncovered|busted|outed)\b(?!\s+to)/i,
  /\b(?:secret|hidden|untold|forbidden)\s+(?:reason|truth|story|cure)/i,
  /\b(?:miracle|magic)\s+(?:cure|pill|drug|food)\b/i,
];

const URGENCY_WORDS = [
  /\b(?:breaking|urgent|alert|developing)\b/i,
  /\b(?:right now|this just in|just in)\b/i,
  /\b(?:before it['']s (?:too late|deleted|removed))\b/i,
];

const NUMBERED_LIST_LURE = /^\s*\d+\s+(?:things?|ways?|reasons?|signs?|times?|secrets?|tricks?|facts?|photos?|pictures?)\b/i;

const ALLCAPS_WORD = /\b[A-Z]{4,}\b/g;

export interface ClickbaitResult {
  score: number;             // 0-100
  level: "low" | "medium" | "high";
  signals: string[];
}

export function analyzeClickbait(title: string, body?: string): ClickbaitResult {
  const signals: string[] = [];
  let score = 0;

  if (!title || title.trim().length === 0) {
    return { score: 0, level: "low", signals: [] };
  }

  for (const re of CURIOSITY_GAPS) {
    if (re.test(title)) {
      signals.push(`Curiosity-gap phrase in title (${describePattern(re)})`);
      score += 25;
      break;
    }
  }

  let sensCount = 0;
  for (const re of SENSATIONAL_WORDS) {
    if (re.test(title)) sensCount++;
  }
  if (sensCount > 0) {
    signals.push(`${sensCount} sensational word${sensCount > 1 ? "s" : ""} in title`);
    score += Math.min(30, sensCount * 12);
  }

  let urgCount = 0;
  for (const re of URGENCY_WORDS) {
    if (re.test(title)) urgCount++;
  }
  if (urgCount > 0) {
    signals.push("Urgency framing in title");
    score += 8;
  }

  if (NUMBERED_LIST_LURE.test(title)) {
    signals.push("Numbered-listicle headline");
    score += 10;
  }

  // ALL-CAPS words (3+ chars), excluding well-known acronyms
  const allcaps = title.match(ALLCAPS_WORD) ?? [];
  const filteredCaps = allcaps.filter((w) => !COMMON_ACRONYMS.has(w));
  if (filteredCaps.length >= 2) {
    signals.push(`${filteredCaps.length} ALL-CAPS words used for emphasis`);
    score += Math.min(15, filteredCaps.length * 5);
  }

  // Excessive punctuation
  const exclaims = (title.match(/!/g) ?? []).length;
  const questions = (title.match(/\?/g) ?? []).length;
  if (exclaims >= 2) {
    signals.push(`${exclaims} exclamation marks in title`);
    score += 8;
  }
  if (questions >= 2) {
    signals.push(`${questions} question marks in title`);
    score += 6;
  }

  // Ellipsis-as-bait
  if (/\.{3,}\s*[a-z]/i.test(title) || /…/.test(title)) {
    signals.push("Headline trails off with ellipsis (clickbait pattern)");
    score += 8;
  }

  // Body checks (lighter)
  if (body && body.length > 200) {
    const bodySnippet = body.slice(0, 4000);
    let bodySens = 0;
    for (const re of SENSATIONAL_WORDS) {
      const matches = bodySnippet.match(new RegExp(re, "gi"));
      if (matches) bodySens += matches.length;
    }
    if (bodySens >= 5) {
      signals.push(`${bodySens} sensational phrases in body text`);
      score += 10;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level: ClickbaitResult["level"] =
    score >= 50 ? "high" : score >= 20 ? "medium" : "low";

  return { score, level, signals };
}

const COMMON_ACRONYMS = new Set([
  "USA", "UK", "EU", "UN", "WHO", "CDC", "FBI", "CIA", "NSA", "NASA",
  "NATO", "UNESCO", "IMF", "GDP", "CEO", "AI", "ML", "API", "URL", "ID",
  "TV", "DC", "NY", "LA", "BBC", "CNN", "NPR", "WSJ", "FT", "AP", "AFP",
  "COVID", "HIV", "AIDS", "DNA", "RNA", "USD", "EUR", "GBP",
]);

function describePattern(re: RegExp): string {
  const src = re.source
    .replace(/\\b/g, "")
    .replace(/\(\?:/g, "(")
    .replace(/\[''']/g, "'")
    .slice(0, 40);
  return src;
}
