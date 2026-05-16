import { analyzeClickbait, type ClickbaitResult } from "./clickbait";
import { validateSafeUrl } from "@/lib/security/sanitize";

export interface PageAnalysis {
  fetched: boolean;
  fetchError: string | null;
  finalUrl: string | null;
  httpStatus: number | null;
  title: string | null;
  description: string | null;
  byline: string | null;
  bylineSource: "meta" | "json-ld" | "selector" | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  ageDays: number | null;
  outboundLinks: number;
  outboundDomains: string[];
  internalLinks: number;
  hasJsonLd: boolean;
  hasOpenGraph: boolean;
  hasAboutLink: boolean;
  hasContactLink: boolean;
  hasCorrectionsLink: boolean;
  clickbait: ClickbaitResult | null;
  wordCount: number;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000; // 1.5 MB cap

/**
 * Single-page GET to extract source-quality signals. Never crawls.
 * Returns a structured analysis or an honest failure record.
 */
export async function analyzePage(rawUrl: string): Promise<PageAnalysis> {
  const empty = (err: string): PageAnalysis => ({
    fetched: false, fetchError: err, finalUrl: null, httpStatus: null,
    title: null, description: null, byline: null, bylineSource: null,
    publishedAt: null, modifiedAt: null, ageDays: null,
    outboundLinks: 0, outboundDomains: [], internalLinks: 0,
    hasJsonLd: false, hasOpenGraph: false,
    hasAboutLink: false, hasContactLink: false, hasCorrectionsLink: false,
    clickbait: null, wordCount: 0,
  });

  let parsed: URL;
  const safe = validateSafeUrl(rawUrl);
  if (!safe.ok || !safe.url) return empty(safe.message ?? "This link type is not allowed.");
  try { parsed = new URL(safe.url); } catch { return empty("Invalid URL"); }

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "ProofbaseBot/1.0 (educational source quality scanner; single-page only)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return empty(`Could not reach page: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) return empty("Redirect missing destination.");
    let next: URL;
    try { next = new URL(location, parsed); } catch { return empty("Redirect destination is invalid."); }
    const nextSafe = validateSafeUrl(next.toString());
    if (!nextSafe.ok || !nextSafe.url) return empty(nextSafe.message ?? "This link type is not allowed.");
    try {
      res = await fetch(nextSafe.url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "ProofbaseBot/1.0 (educational source quality scanner; single-page only)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      return empty(`Could not reach page: ${e instanceof Error ? e.message : String(e)}`);
    }
    parsed = new URL(nextSafe.url);
  }

  const baseResult = empty("");
  baseResult.fetchError = null;
  baseResult.finalUrl = res.url;
  baseResult.httpStatus = res.status;

  if (!res.ok) {
    baseResult.fetched = false;
    baseResult.fetchError = `HTTP ${res.status}`;
    return baseResult;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    baseResult.fetched = false;
    baseResult.fetchError = `Content-Type ${contentType || "unknown"} is not HTML`;
    return baseResult;
  }

  // Read at most MAX_BYTES
  let html: string;
  try {
    const reader = res.body?.getReader();
    if (!reader) {
      html = await res.text();
      if (html.length > MAX_BYTES) html = html.slice(0, MAX_BYTES);
    } else {
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (total < MAX_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.length;
        }
      }
      try { await reader.cancel(); } catch { /* ignore */ }
      const buffer = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buffer.set(c.subarray(0, Math.min(c.length, MAX_BYTES - off)), off); off += c.length; if (off >= MAX_BYTES) break; }
      html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    }
  } catch (e) {
    baseResult.fetched = false;
    baseResult.fetchError = `Read failure: ${e instanceof Error ? e.message : String(e)}`;
    return baseResult;
  }

  baseResult.fetched = true;
  return enrichFromHtml(html, parsed, baseResult);
}

function enrichFromHtml(html: string, baseUrl: URL, r: PageAnalysis): PageAnalysis {
  // <head> only — limit search depth for meta parsing
  const headMatch = html.match(/<head\b[\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : html.slice(0, 60_000);
  const body = headMatch ? html.slice(headMatch[0].length) : html;

  // Title
  const rawTitle = firstMatch(head, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim();
  r.title = rawTitle ? decodeEntities(rawTitle) : null;
  const ogTitle = metaContent(head, ["og:title", "twitter:title"]);
  if (!r.title && ogTitle) r.title = ogTitle;

  // Description
  r.description = metaContent(head, ["description", "og:description", "twitter:description"]);

  // OpenGraph presence
  r.hasOpenGraph = /<meta[^>]+property=["']og:/i.test(head);

  // JSON-LD presence + try to extract author/date from it
  const ldMatches = head.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  r.hasJsonLd = ldMatches.length > 0;
  for (const block of ldMatches) {
    const inner = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    const parsedJson = tryParseJson(inner);
    extractFromJsonLd(parsedJson, r);
  }

  // Meta author
  if (!r.byline) {
    const author = metaContent(head, ["author", "article:author", "twitter:creator"]);
    if (author && author.length < 200 && !author.startsWith("http")) {
      r.byline = decodeEntities(author);
      r.bylineSource = "meta";
    }
  }

  // Meta published / modified
  if (!r.publishedAt) {
    r.publishedAt = metaContent(head, [
      "article:published_time", "datePublished", "pubdate", "publish-date", "date",
    ]);
  }
  if (!r.modifiedAt) {
    r.modifiedAt = metaContent(head, ["article:modified_time", "dateModified"]);
  }

  // <time datetime="..."> fallback for date
  if (!r.publishedAt) {
    const timeAttr = firstMatch(html.slice(0, 200_000), /<time[^>]+datetime=["']([^"']+)["']/i);
    if (timeAttr) r.publishedAt = timeAttr;
  }

  // Byline fallback from common selectors
  if (!r.byline) {
    const bylineMatch =
      firstMatch(body.slice(0, 80_000), /<[^>]+rel=["']author["'][^>]*>([^<]{2,80})</i) ??
      firstMatch(body.slice(0, 80_000), /<[^>]+class=["'][^"']*\bbyline\b[^"']*["'][^>]*>([\s\S]{2,200}?)</i) ??
      firstMatch(body.slice(0, 80_000), /<[^>]+class=["'][^"']*\bauthor(?:-name)?\b[^"']*["'][^>]*>([\s\S]{2,200}?)</i);
    if (bylineMatch) {
      const cleaned = stripTags(bylineMatch).replace(/^\s*by\s+/i, "").trim();
      if (cleaned.length > 2 && cleaned.length < 120) {
        r.byline = decodeEntities(cleaned);
        r.bylineSource = "selector";
      }
    }
  }

  // Normalize dates
  if (r.publishedAt) {
    const parsed = Date.parse(r.publishedAt);
    if (!Number.isNaN(parsed)) {
      r.publishedAt = new Date(parsed).toISOString();
      r.ageDays = Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
    } else {
      r.publishedAt = null;
    }
  }
  if (r.modifiedAt) {
    const parsed = Date.parse(r.modifiedAt);
    if (!Number.isNaN(parsed)) r.modifiedAt = new Date(parsed).toISOString();
    else r.modifiedAt = null;
  }

  // Outbound links: extract href + href-base resolution
  const sameHost = baseUrl.hostname.replace(/^www\./i, "");
  const linkMatches = body.match(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi) ?? [];
  const outDomains = new Set<string>();
  let outCount = 0;
  let inCount = 0;
  let hasAbout = false, hasContact = false, hasCorrections = false;

  for (const raw of linkMatches) {
    const href = firstMatch(raw, /href=["']([^"']+)["']/i);
    if (!href) continue;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    let abs: URL;
    try { abs = new URL(href, baseUrl); } catch { continue; }
    const host = abs.hostname.replace(/^www\./i, "");
    if (host === sameHost) {
      inCount++;
      const p = abs.pathname.toLowerCase();
      if (!hasAbout       && (p === "/about" || p.startsWith("/about/") || p.includes("/about-us"))) hasAbout = true;
      if (!hasContact     && (p === "/contact" || p.startsWith("/contact/") || p.includes("/contact-us"))) hasContact = true;
      if (!hasCorrections && (p.includes("/corrections") || p.includes("/ethics") || p.includes("/standards"))) hasCorrections = true;
    } else if (abs.protocol === "http:" || abs.protocol === "https:") {
      outCount++;
      outDomains.add(host);
    }
  }

  r.outboundLinks = outCount;
  r.internalLinks = inCount;
  r.outboundDomains = Array.from(outDomains).slice(0, 12);
  r.hasAboutLink = hasAbout;
  r.hasContactLink = hasContact;
  r.hasCorrectionsLink = hasCorrections;

  // Word count from visible text approximation
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  r.wordCount = text.length === 0 ? 0 : text.split(" ").length;

  // Clickbait
  r.clickbait = analyzeClickbait(r.title ?? "", text);

  return r;
}

function firstMatch(haystack: string, re: RegExp): string | null {
  const m = haystack.match(re);
  return m ? (m[1] ?? null) : null;
}

function metaContent(head: string, names: string[]): string | null {
  for (const name of names) {
    const reName = new RegExp(
      `<meta[^>]+(?:name|property|itemprop)=["']${escapeRe(name)}["'][^>]*content=["']([^"']+)["']`,
      "i"
    );
    const reContentFirst = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property|itemprop)=["']${escapeRe(name)}["']`,
      "i"
    );
    const m = head.match(reName) ?? head.match(reContentFirst);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function tryParseJson(s: string): unknown {
  try { return JSON.parse(s); }
  catch { return null; }
}

interface JsonLdLike {
  "@type"?: string | string[];
  author?: unknown;
  datePublished?: string;
  dateModified?: string;
  "@graph"?: JsonLdLike[];
}

function extractFromJsonLd(node: unknown, r: PageAnalysis): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) extractFromJsonLd(item, r);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as JsonLdLike;

  if (obj["@graph"]) extractFromJsonLd(obj["@graph"], r);

  if (!r.byline && obj.author !== undefined) {
    r.byline = jsonLdAuthorName(obj.author);
    if (r.byline) r.bylineSource = "json-ld";
  }
  if (!r.publishedAt && typeof obj.datePublished === "string") {
    r.publishedAt = obj.datePublished;
  }
  if (!r.modifiedAt && typeof obj.dateModified === "string") {
    r.modifiedAt = obj.dateModified;
  }
}

function jsonLdAuthorName(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim().slice(0, 160) || null;
  if (Array.isArray(value)) {
    const names = value.map(jsonLdAuthorName).filter((x): x is string => !!x);
    return names.length > 0 ? names.join(", ") : null;
  }
  if (typeof value === "object") {
    const obj = value as { name?: string };
    if (typeof obj.name === "string") return obj.name.trim().slice(0, 160) || null;
  }
  return null;
}
