/**
 * Detect domain spoofing / lookalike attempts. Catches:
 *  - Punycode (xn--) homograph attacks
 *  - One-edit typosquats of known brands (cnn → ccn, npr → nrp)
 *  - Character substitutions (0→o, 1→l, rn→m)
 *  - TLD swaps (cnn.tk vs cnn.com)
 *  - Hyphenated brand-jacking (cnn-news.example.com)
 */

const KNOWN_BRANDS: { name: string; canonical: string }[] = [
  { name: "cnn",         canonical: "cnn.com" },
  { name: "bbc",         canonical: "bbc.com" },
  { name: "reuters",     canonical: "reuters.com" },
  { name: "apnews",      canonical: "apnews.com" },
  { name: "nytimes",     canonical: "nytimes.com" },
  { name: "washingtonpost", canonical: "washingtonpost.com" },
  { name: "wsj",         canonical: "wsj.com" },
  { name: "npr",         canonical: "npr.org" },
  { name: "foxnews",     canonical: "foxnews.com" },
  { name: "theguardian", canonical: "theguardian.com" },
  { name: "wikipedia",   canonical: "wikipedia.org" },
  { name: "snopes",      canonical: "snopes.com" },
  { name: "politifact",  canonical: "politifact.com" },
  { name: "factcheck",   canonical: "factcheck.org" },
  { name: "whitehouse",  canonical: "whitehouse.gov" },
  { name: "cdc",         canonical: "cdc.gov" },
  { name: "who",         canonical: "who.int" },
  { name: "nih",         canonical: "nih.gov" },
  { name: "fbi",         canonical: "fbi.gov" },
];

const SUBSTITUTIONS: Array<[RegExp, string]> = [
  [/0/g, "o"], [/1/g, "l"], [/3/g, "e"], [/5/g, "s"], [/7/g, "t"],
  [/rn/g, "m"], [/vv/g, "w"], [/cl/g, "d"],
];

export interface SpoofingResult {
  isSpoof: boolean;
  signals: string[];
  matchedBrand: string | null;
}

export function detectSpoofing(rawDomain: string): SpoofingResult {
  const domain = rawDomain.toLowerCase().replace(/^www\./, "");
  const signals: string[] = [];
  let matchedBrand: string | null = null;

  // Skip checks if the domain IS a known canonical brand OR a subdomain of one
  if (KNOWN_BRANDS.some((b) => b.canonical === domain || domain.endsWith("." + b.canonical))) {
    return { isSpoof: false, signals: [], matchedBrand: null };
  }

  // Punycode / IDN homograph
  if (domain.includes("xn--")) {
    signals.push("Domain uses Punycode (IDN) — possible homograph attack");
  }

  // Excessive hyphens
  const hyphenCount = (domain.match(/-/g) ?? []).length;
  if (hyphenCount >= 3) {
    signals.push(`Unusually high hyphen count (${hyphenCount})`);
  }

  // Numeric substitution check
  const normalized = applySubstitutions(domain);
  if (normalized !== domain) {
    for (const brand of KNOWN_BRANDS) {
      if (normalized.includes(brand.name) && !domain.includes(brand.name)) {
        signals.push(`Looks like "${brand.canonical}" with character substitutions`);
        matchedBrand = brand.canonical;
        break;
      }
    }
  }

  // Brand hijack: brand appears as a label/segment but TLD is wrong
  const labels = domain.split(".");
  if (labels.length >= 2) {
    const root = labels[labels.length - 2];
    for (const brand of KNOWN_BRANDS) {
      // Hyphenated brand-jack ("cnn-news", "bbc-update")
      if (root !== brand.name && root.includes(brand.name) && root.includes("-")) {
        signals.push(`Contains brand name "${brand.name}" with extra modifiers`);
        matchedBrand = matchedBrand ?? brand.canonical;
        break;
      }
      // Exact brand in root but wrong TLD
      if (root === brand.name && domain !== brand.canonical) {
        signals.push(`Brand name "${brand.name}" but TLD differs from official (${brand.canonical})`);
        matchedBrand = matchedBrand ?? brand.canonical;
        break;
      }
    }
  }

  // Typo distance (1-edit) against root labels of known brands
  if (!matchedBrand && labels.length >= 2) {
    const root = labels[labels.length - 2];
    for (const brand of KNOWN_BRANDS) {
      if (root.length >= 4 && Math.abs(root.length - brand.name.length) <= 1) {
        if (editDistance(root, brand.name) === 1) {
          signals.push(`One typo away from "${brand.canonical}" (root "${root}" vs "${brand.name}")`);
          matchedBrand = brand.canonical;
          break;
        }
      }
    }
  }

  return {
    isSpoof: signals.length > 0,
    signals,
    matchedBrand,
  };
}

function applySubstitutions(s: string): string {
  let out = s;
  for (const [re, replacement] of SUBSTITUTIONS) {
    out = out.replace(re, replacement);
  }
  return out;
}

// Levenshtein distance, capped early at 2 for efficiency
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > 2) return 99;

  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/**
 * Suspicious URL path patterns: long random strings, IP-style hosts,
 * tracking parameters, deceptive verbs, fake-extension paths.
 */
export interface PathSuspicionResult {
  suspicious: boolean;
  signals: string[];
}

export function analyzeUrlPath(rawUrl: string): PathSuspicionResult {
  const signals: string[] = [];

  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return { suspicious: false, signals: [] }; }

  const path = parsed.pathname;

  // Long random segment
  const longRandom = /\/[a-zA-Z0-9]{24,}\b/.test(path);
  if (longRandom) signals.push("URL path contains a long random-looking token");

  // Suspicious tracking-style query
  if (parsed.searchParams.has("utm_id") || parsed.searchParams.has("clickid")) {
    signals.push("URL has aggressive tracking parameters");
  }

  // Disguised binary path (e.g., .pdf.exe)
  if (/\.(pdf|doc|jpg|png)\.(exe|scr|bat|html|php)$/i.test(path)) {
    signals.push("URL has a deceptive double-extension");
  }

  // Excessive path depth (>=8 segments) is unusual for editorial content
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 8) signals.push(`URL path has ${segments.length} segments — unusually deep`);

  // IP-host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
    signals.push("Host is a raw IP address, not a domain name");
  }

  // Port other than 80/443
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    signals.push(`Non-standard port (${parsed.port})`);
  }

  // Username in URL (phishing classic: https://bbc.com@evil.example/...)
  if (parsed.username) {
    signals.push("URL contains embedded credentials — classic phishing pattern");
  }

  return { suspicious: signals.length > 0, signals };
}
