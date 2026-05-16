/**
 * Safe URL extractor — for the public POST /api/extract-url endpoint.
 *
 * Security posture (V1):
 *  - SSRF guard: literal-IP block list + DNS resolution check (rejects if ANY
 *    resolved address is private/loopback/link-local/multicast/cloud-metadata).
 *  - Only http/https schemes; rejects URLs with embedded credentials.
 *  - At most 1 redirect, re-validated against the same guard.
 *  - 12s timeout, 2MB body cap, 10_000 char extracted-text cap.
 *  - Reads only the URL the user submitted. NO recursive crawling.
 *  - Uses cheerio for HTML parsing — no headless browser, no JS execution.
 */

import { promises as dns } from "node:dns";
import * as cheerio from "cheerio";

export const FETCH_TIMEOUT_MS = 12_000;
export const MAX_HTML_BYTES   = 2 * 1024 * 1024;  // 2 MB
export const MAX_TEXT_CHARS   = 10_000;
export const MAX_REDIRECTS    = 1;

export interface ExtractedMetadata {
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  siteName: string | null;
  author: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  /** Plain-text preview of the article body, capped to MAX_TEXT_CHARS. */
  articleText: string;
  outboundLinks: { href: string; host: string }[];
  internalLinks: number;
  headings: { level: 1 | 2 | 3; text: string }[];
  jsonLd: JsonLdSummary;
  bytesRead: number;
  redirectsFollowed: number;
  warnings: string[];
}

export interface JsonLdSummary {
  hasSchema: boolean;
  types: string[];
  claimReview?: {
    claimReviewed?: string;
    reviewRating?: string;
    author?: string;
    datePublished?: string;
    url?: string;
  };
  article?: {
    headline?: string;
    author?: string;
    datePublished?: string;
    dateModified?: string;
    publisher?: string;
  };
}

export class ExtractError extends Error {
  constructor(public reason: string, public detail?: string) {
    super(reason);
    this.name = "ExtractError";
  }
}

/** Public-facing entry point. */
export async function extractFromUrl(rawUrl: string): Promise<ExtractedMetadata> {
  // ── 1) URL hygiene ──
  const validated = validateUrl(rawUrl);
  await assertHostIsPublic(validated.hostname);

  // ── 2) Fetch with manual redirect handling ──
  const fetched = await fetchWithSafety(validated.toString(), 0);

  // ── 3) Parse ──
  return parseHtml(fetched.html, fetched.finalUrl, fetched.status, fetched.contentType, fetched.bytesRead, fetched.redirects, fetched.warnings);
}

// ────────────────────────────────────────────────────────────────────────────
// URL + IP validation
// ────────────────────────────────────────────────────────────────────────────

function validateUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new ExtractError("invalid-url", "Could not parse the URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new ExtractError("invalid-protocol", `Protocol ${u.protocol} is not allowed. Only http and https.`);
  }
  if (u.username || u.password) {
    throw new ExtractError("credentials-in-url", "URLs with embedded credentials are not allowed.");
  }
  // Block IP literals directly here — DNS resolution happens next for hostnames
  if (isLiteralIp(u.hostname)) {
    if (isPrivateOrReservedIp(u.hostname)) {
      throw new ExtractError("private-ip", `Host ${u.hostname} is a private, loopback, or reserved IP.`);
    }
  }
  // Reject obvious bad hostnames
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host === ""
  ) {
    throw new ExtractError("private-host", `Host "${u.hostname}" is not a public domain.`);
  }
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new ExtractError("non-standard-port", `Non-standard port ${u.port} is not allowed.`);
  }
  return u;
}

async function assertHostIsPublic(hostname: string): Promise<void> {
  // If it's a literal IP, validateUrl already screened it.
  if (isLiteralIp(hostname)) return;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (e) {
    throw new ExtractError("dns-failure", `Could not resolve ${hostname}: ${e instanceof Error ? e.message : "unknown DNS error"}`);
  }
  if (!addresses || addresses.length === 0) {
    throw new ExtractError("dns-empty", `No addresses returned for ${hostname}.`);
  }
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new ExtractError("private-ip", `Host ${hostname} resolves to a private/reserved IP (${address}).`);
    }
  }
}

function isLiteralIp(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

/**
 * Block:
 *  - IPv4: 0.0.0.0/8, 10/8, 100.64/10 (CGNAT), 127/8, 169.254/16 (incl. AWS metadata),
 *          172.16/12, 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24,
 *          203.0.113/24, 224/4 (multicast), 240/4 (reserved)
 *  - IPv6: ::, ::1, fc00::/7 (ULA), fe80::/10 (link-local), ff00::/8 (multicast),
 *          ::ffff:0:0/96 (IPv4-mapped — we re-check the embedded IPv4)
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some((p) => p < 0 || p > 255 || Number.isNaN(p))) return true;
    const [a, b] = parts;
    if (a === 0)                       return true;
    if (a === 10)                      return true;
    if (a === 127)                     return true;
    if (a === 169 && b === 254)        return true;   // includes 169.254.169.254 cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0)          return true;
    if (a === 192 && b === 168)        return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51)         return true;
    if (a === 203 && b === 0)          return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224)                       return true;   // multicast + reserved
    return false;
  }
  // IPv6
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1" || lower === "0:0:0:0:0:0:0:0" || lower === "0:0:0:0:0:0:0:1") return true;
  // IPv4-mapped IPv6 — re-check the embedded v4
  const v4mapped = lower.match(/^::ffff:([\d.]+)$/);
  if (v4mapped) return isPrivateOrReservedIp(v4mapped[1]);
  // Unique-local fc00::/7
  if (/^fc[0-9a-f]{2}:/.test(lower) || /^fd[0-9a-f]{2}:/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true;
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Safe fetch
// ────────────────────────────────────────────────────────────────────────────

interface FetchResult {
  finalUrl: string;
  status: number;
  contentType: string | null;
  html: string;
  bytesRead: number;
  redirects: number;
  warnings: string[];
}

async function fetchWithSafety(url: string, redirects: number): Promise<FetchResult> {
  if (redirects > MAX_REDIRECTS) {
    throw new ExtractError("too-many-redirects", `Refused to follow more than ${MAX_REDIRECTS} redirect(s).`);
  }
  const warnings: string[] = [];

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      // Manual redirect handling — we re-validate the destination ourselves
      redirect: "manual",
      headers: {
        "User-Agent": "ProofbaseBot/1.0; public source verification",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.7",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new ExtractError("fetch-failed", e instanceof Error ? e.message : String(e));
  }

  // Manual redirect
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (!loc) throw new ExtractError("redirect-no-location", `HTTP ${res.status} without Location header.`);
    let nextUrl: URL;
    try { nextUrl = new URL(loc, url); }
    catch { throw new ExtractError("redirect-bad-location", `Invalid Location header: ${loc}`); }
    // Re-validate scheme + host
    validateUrl(nextUrl.toString());
    await assertHostIsPublic(nextUrl.hostname);
    warnings.push(`Followed 1 redirect to ${nextUrl.toString()}`);
    return await fetchWithSafety(nextUrl.toString(), redirects + 1);
  }

  const contentType = res.headers.get("content-type") ?? null;
  if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
    throw new ExtractError("unsupported-content-type", `Refusing non-HTML content (${contentType}).`);
  }

  // Streamed read with byte cap
  const reader = res.body?.getReader();
  let bytesRead = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (bytesRead < MAX_HTML_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        bytesRead += value.byteLength;
        if (bytesRead >= MAX_HTML_BYTES) {
          // Truncate to cap and stop reading
          const remaining = MAX_HTML_BYTES - (bytesRead - value.byteLength);
          chunks.push(value.subarray(0, Math.max(0, remaining)));
          warnings.push(`Response exceeded ${MAX_HTML_BYTES} bytes — truncated.`);
          try { await reader.cancel(); } catch { /* ignore */ }
          break;
        }
        chunks.push(value);
      }
    }
  } else {
    // No streaming body — read fully but enforce cap
    const text = await res.text();
    if (text.length > MAX_HTML_BYTES) {
      warnings.push(`Response exceeded ${MAX_HTML_BYTES} bytes — truncated.`);
    }
    const truncated = text.slice(0, MAX_HTML_BYTES);
    return { finalUrl: res.url || url, status: res.status, contentType, html: truncated, bytesRead: truncated.length, redirects, warnings };
  }

  const buffer = new Uint8Array(Math.min(bytesRead, MAX_HTML_BYTES));
  let off = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buffer.byteLength - off);
    buffer.set(c.subarray(0, take), off);
    off += take;
    if (off >= buffer.byteLength) break;
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return { finalUrl: res.url || url, status: res.status, contentType, html, bytesRead: off, redirects, warnings };
}

// ────────────────────────────────────────────────────────────────────────────
// Parse
// ────────────────────────────────────────────────────────────────────────────

function parseHtml(
  html: string,
  finalUrl: string,
  httpStatus: number,
  contentType: string | null,
  bytesRead: number,
  redirectsFollowed: number,
  warnings: string[]
): ExtractedMetadata {
  const $ = cheerio.load(html);
  const baseUrl = new URL(finalUrl);

  // Meta tags
  const og: Record<string, string> = {};
  const tw: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const p = $(el).attr("property") ?? "";
    const c = ($(el).attr("content") ?? "").trim();
    if (c) og[p.slice(3)] = c;
  });
  $('meta[name^="twitter:"]').each((_, el) => {
    const n = $(el).attr("name") ?? "";
    const c = ($(el).attr("content") ?? "").trim();
    if (c) tw[n.slice(8)] = c;
  });

  const title =
    ($("title").first().text() || "").trim() ||
    og["title"] ||
    tw["title"] ||
    null;

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    og["description"] ||
    tw["description"] ||
    null;

  const canonicalRaw = $('link[rel="canonical"]').attr("href")?.trim() ?? null;
  const canonicalUrl = canonicalRaw ? safeAbs(canonicalRaw, baseUrl) : null;

  const siteName = og["site_name"] || tw["site"] || baseUrl.hostname.replace(/^www\./, "");

  // Authors — first one we find wins
  const author =
    $('meta[name="author"]').attr("content")?.trim() ||
    $('meta[property="article:author"]').attr("content")?.trim() ||
    tw["creator"] ||
    $('[rel="author"]').first().text().trim() ||
    $('[itemprop="author"] [itemprop="name"]').first().text().trim() ||
    $(".byline, .author, .author-name").first().text().trim().replace(/^by\s+/i, "") ||
    null;

  // Dates
  const publishedRaw =
    $('meta[property="article:published_time"]').attr("content")?.trim() ||
    $('meta[itemprop="datePublished"]').attr("content")?.trim() ||
    $("time[datetime]").first().attr("datetime")?.trim() ||
    null;
  const modifiedRaw =
    $('meta[property="article:modified_time"]').attr("content")?.trim() ||
    $('meta[itemprop="dateModified"]').attr("content")?.trim() ||
    null;
  const publishedAt = toIso(publishedRaw);
  const modifiedAt  = toIso(modifiedRaw);

  // Headings (cap)
  const headings: ExtractedMetadata["headings"] = [];
  $("h1, h2, h3").slice(0, 30).each((_, el) => {
    const level = (el.tagName?.toLowerCase() === "h1" ? 1 : el.tagName?.toLowerCase() === "h2" ? 2 : 3) as 1 | 2 | 3;
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text && text.length <= 200) headings.push({ level, text });
  });

  // Links
  const baseHost = baseUrl.hostname.replace(/^www\./, "");
  const outbound = new Map<string, { href: string; host: string }>();
  let internalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:") || href.startsWith("tel:")) return;
    let abs: URL;
    try { abs = new URL(href, baseUrl); } catch { return; }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return;
    const host = abs.hostname.replace(/^www\./, "");
    if (host === baseHost) { internalLinks++; return; }
    if (!outbound.has(abs.toString())) outbound.set(abs.toString(), { href: abs.toString(), host });
  });
  const outboundLinks = Array.from(outbound.values()).slice(0, 40);

  // JSON-LD
  const jsonLd = extractJsonLd($);

  // Article text — strip scripts/styles, take main content if present
  const textRoot = $("main, article").first().length ? $("main, article").first() : $("body");
  textRoot.find("script, style, noscript, nav, header, footer, aside, form").remove();
  const rawText = textRoot.text().replace(/\s+/g, " ").trim();
  const articleText = rawText.slice(0, MAX_TEXT_CHARS);
  if (rawText.length > MAX_TEXT_CHARS) warnings.push(`Article text truncated to ${MAX_TEXT_CHARS} chars.`);

  return {
    finalUrl,
    httpStatus,
    contentType,
    title,
    description,
    canonicalUrl,
    siteName,
    author,
    publishedAt,
    modifiedAt,
    openGraph: og,
    twitter: tw,
    articleText,
    outboundLinks,
    internalLinks,
    headings,
    jsonLd,
    bytesRead,
    redirectsFollowed,
    warnings,
  };
}

function safeAbs(href: string, base: URL): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function toIso(s: string | null): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

function extractJsonLd($: cheerio.CheerioAPI): JsonLdSummary {
  const out: JsonLdSummary = { hasSchema: false, types: [] };
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      walkJsonLd(parsed, out);
    } catch { /* ignore — malformed JSON-LD is common */ }
  });
  if (out.types.length > 0) out.hasSchema = true;
  return out;
}

interface JsonLdNode {
  "@type"?: string | string[];
  "@graph"?: JsonLdNode[];
  claimReviewed?: string;
  reviewRating?: { ratingValue?: string; alternateName?: string } | string;
  author?: unknown;
  datePublished?: string;
  dateModified?: string;
  url?: string;
  headline?: string;
  publisher?: { name?: string } | string;
}

function walkJsonLd(node: unknown, out: JsonLdSummary): void {
  if (!node) return;
  if (Array.isArray(node)) { for (const n of node) walkJsonLd(n, out); return; }
  if (typeof node !== "object") return;
  const obj = node as JsonLdNode;

  if (obj["@graph"]) walkJsonLd(obj["@graph"], out);

  const types = obj["@type"]
    ? Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]]
    : [];

  for (const t of types) {
    if (!out.types.includes(t)) out.types.push(t);
    if (t === "ClaimReview" && !out.claimReview) {
      const rating =
        typeof obj.reviewRating === "string" ? obj.reviewRating :
        obj.reviewRating?.alternateName ?? obj.reviewRating?.ratingValue;
      out.claimReview = {
        claimReviewed: obj.claimReviewed,
        reviewRating: rating,
        author: authorName(obj.author),
        datePublished: obj.datePublished,
        url: obj.url,
      };
    }
    if ((t === "Article" || t === "NewsArticle" || t === "BlogPosting") && !out.article) {
      out.article = {
        headline: obj.headline,
        author: authorName(obj.author),
        datePublished: obj.datePublished,
        dateModified: obj.dateModified,
        publisher: typeof obj.publisher === "string" ? obj.publisher : obj.publisher?.name,
      };
    }
  }
}

function authorName(a: unknown): string | undefined {
  if (!a) return undefined;
  if (typeof a === "string") return a;
  if (Array.isArray(a)) {
    const names = a.map(authorName).filter((x): x is string => !!x);
    return names.length ? names.join(", ") : undefined;
  }
  if (typeof a === "object") {
    const o = a as { name?: string };
    if (typeof o.name === "string") return o.name;
  }
  return undefined;
}
