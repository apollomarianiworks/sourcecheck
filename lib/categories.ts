export type SourceCategory =
  | "government"
  | "academic"
  | "medical-science"
  | "court-legal"
  | "mainstream-news"
  | "local-news"
  | "advocacy"
  | "fact-checker"
  | "encyclopedia"
  | "tabloid"
  | "conspiracy"
  | "satire"
  | "blog"
  | "social-media"
  | "unknown";

export const CATEGORY_META: Record<SourceCategory, { label: string; glyph: string; tone: "good" | "neutral" | "warn" | "bad" }> = {
  "government":      { label: "Government",       glyph: "⊞", tone: "good"    },
  "academic":        { label: "Academic",         glyph: "⊕", tone: "good"    },
  "medical-science": { label: "Medical / Science",glyph: "✚", tone: "good"    },
  "court-legal":     { label: "Court / Legal",    glyph: "⚖", tone: "good"    },
  "mainstream-news": { label: "Mainstream News",  glyph: "▤", tone: "good"    },
  "local-news":      { label: "Local News",       glyph: "▢", tone: "neutral" },
  "fact-checker":    { label: "Fact-Checker",     glyph: "✓", tone: "good"    },
  "encyclopedia":    { label: "Encyclopedia",     glyph: "▦", tone: "neutral" },
  "advocacy":        { label: "Advocacy / NGO",   glyph: "◈", tone: "neutral" },
  "tabloid":         { label: "Tabloid",          glyph: "◧", tone: "warn"    },
  "conspiracy":      { label: "Conspiracy",       glyph: "⚠", tone: "bad"     },
  "satire":          { label: "Satire",           glyph: "☺", tone: "warn"    },
  "blog":            { label: "Personal Blog",    glyph: "✎", tone: "warn"    },
  "social-media":    { label: "Social Media",     glyph: "▣", tone: "warn"    },
  "unknown":         { label: "Unknown",          glyph: "?", tone: "neutral" },
};

const FACT_CHECKER_DOMAINS = new Set([
  "politifact.com", "factcheck.org", "snopes.com", "fullfact.org",
  "leadstories.com", "factcheck.afp.com", "reuters.com/fact-check",
  "apnews.com/hub/ap-fact-check", "checkyourfact.com",
  "africacheck.org", "factcheckni.org", "verafiles.org",
]);

const SOCIAL_MEDIA_DOMAINS = new Set([
  "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com",
  "youtube.com", "youtu.be", "linkedin.com", "reddit.com", "snapchat.com",
  "pinterest.com", "tumblr.com", "threads.net", "mastodon.social",
  "bsky.app", "t.me", "discord.com", "weibo.com", "vk.com",
]);

const BLOG_HOST_PATTERNS = [
  /\bblogspot\./, /\bwordpress\.com$/, /\bmedium\.com$/, /\bsubstack\.com$/,
  /\bghost\.io$/, /\.tumblr\.com$/, /\.livejournal\.com$/, /\bblogger\.com$/,
];

const ENCYCLOPEDIA_PATTERNS = [
  /^.+\.wikipedia\.org$/, /^.+\.wikimedia\.org$/, /^en\.wiktionary\.org$/,
  /^.+\.fandom\.com$/, /^.+\.wikia\.com$/, /^britannica\.com$/,
];

const COURT_LEGAL_PATTERNS = [
  /\.uscourts\.gov$/, /\.supremecourt\.gov$/, /\bjustice\.gov$/,
  /\beur-lex\.europa\.eu$/, /\bcourtlistener\.com$/, /\boyez\.org$/,
];

const ACADEMIC_PATTERNS = [
  /\.edu$/, /\.ac\.[a-z]{2}$/,
  /^arxiv\.org$/, /^biorxiv\.org$/, /^medrxiv\.org$/,
  /^scholar\.google\./, /^pubmed\.ncbi\.nlm\.nih\.gov$/,
  /^.+\.nature\.com$/, /^nature\.com$/, /^science\.org$/, /^thelancet\.com$/,
  /^nejm\.org$/, /^cell\.com$/, /^pnas\.org$/,
];

const GOVERNMENT_PATTERNS = [
  /\.gov$/, /\.gov\.[a-z]{2}$/, /\.mil$/, /\.mil\.[a-z]{2}$/,
  /\.gc\.ca$/,           // Canada
  /\.gov\.uk$/,           // UK (also matches .gov.uk via above)
  /\.europa\.eu$/,        // EU institutions
  /\.un\.org$/, /\.who\.int$/, /\.unesco\.org$/, /\.imf\.org$/,
  /\.worldbank\.org$/, /\.nato\.int$/, /\.oecd\.org$/,
];

const SATIRE_DOMAINS = new Set([
  "theonion.com", "babylonbee.com", "clickhole.com", "thedailymash.co.uk",
  "thebeaverton.com", "newsbiscuit.com", "the-rooster.com", "reductress.com",
]);

const CONSPIRACY_DOMAINS = new Set([
  "infowars.com", "naturalnews.com", "beforeitsnews.com", "yournewswire.com",
  "newspunch.com", "globalresearch.ca", "thegatewaypundit.com",
]);

const TABLOID_DOMAINS = new Set([
  "dailymail.co.uk", "thesun.co.uk", "nypost.com", "mirror.co.uk",
  "dailystar.co.uk", "thenationalenquirer.com", "tmz.com",
  "radaronline.com", "thedailybeast.com",
]);

const LOCAL_NEWS_PATTERNS = [
  /\b(daily|herald|tribune|gazette|chronicle|sentinel|register|times|news|post|press|telegram|journal|examiner|courier|dispatch|sun|star|reporter|bulletin|recorder|standard|guardian|enquirer|democrat)\.com$/i,
  /\bpatch\.com$/, /\bnews-?leader\./i, /\b(city|county|state)\..*\.us$/i,
];

const MAINSTREAM_NEWS_DOMAINS = new Set([
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "npr.org",
  "theguardian.com", "nytimes.com", "washingtonpost.com", "wsj.com",
  "economist.com", "ft.com", "bloomberg.com", "cnn.com", "abcnews.go.com",
  "nbcnews.com", "cbsnews.com", "usatoday.com", "time.com", "theatlantic.com",
  "newyorker.com", "vox.com", "slate.com", "axios.com", "politico.com",
  "thehill.com", "foxnews.com", "msnbc.com", "cnbc.com", "aljazeera.com",
  "dw.com", "france24.com", "dw.de",
]);

const ADVOCACY_PATTERNS = [
  /\.org$/,
];

/**
 * Infer source category from a domain, even if not in the reputation DB.
 * Order matters — more specific rules first.
 */
export function inferCategory(rawDomain: string): SourceCategory {
  const domain = rawDomain.toLowerCase().replace(/^www\./, "");

  if (FACT_CHECKER_DOMAINS.has(domain)) return "fact-checker";
  if (SATIRE_DOMAINS.has(domain))       return "satire";
  if (CONSPIRACY_DOMAINS.has(domain))   return "conspiracy";
  if (TABLOID_DOMAINS.has(domain))      return "tabloid";
  if (SOCIAL_MEDIA_DOMAINS.has(domain)) return "social-media";
  if (MAINSTREAM_NEWS_DOMAINS.has(domain)) return "mainstream-news";

  for (const re of COURT_LEGAL_PATTERNS) if (re.test(domain)) return "court-legal";
  for (const re of GOVERNMENT_PATTERNS)  if (re.test(domain)) return "government";
  for (const re of ACADEMIC_PATTERNS)    if (re.test(domain)) return "academic";
  for (const re of ENCYCLOPEDIA_PATTERNS) if (re.test(domain)) return "encyclopedia";
  for (const re of BLOG_HOST_PATTERNS)    if (re.test(domain)) return "blog";
  for (const re of LOCAL_NEWS_PATTERNS)   if (re.test(domain)) return "local-news";
  for (const re of ADVOCACY_PATTERNS)     if (re.test(domain)) return "advocacy";

  return "unknown";
}

export function categoryToneColor(tone: "good" | "neutral" | "warn" | "bad"): string {
  switch (tone) {
    case "good":    return "text-phosphor-green border-green-700";
    case "neutral": return "text-phosphor-cyan border-cyan-800";
    case "warn":    return "text-phosphor-amber border-amber-700";
    case "bad":     return "text-phosphor-red border-red-800";
  }
}
