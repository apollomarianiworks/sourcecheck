export const SAFE_URL_PROTOCOLS = new Set(["http:", "https:"]);

const INVISIBLE_CHARS_RE = /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g;
const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPTISH_RE = /\b(?:script|iframe|object|embed|onerror|onload|onclick|onmouseover|javascript:|data:)\b/i;
const PRIVATE_HOST_RE = /(^|\.)localhost$|\.local$|\.internal$|\.lan$/i;

export interface SafeUrlResult {
  ok: boolean;
  url?: string;
  message?: string;
  reason?: string;
}

export function stripInvisibleCharacters(input: string): string {
  return (input ?? "").replace(INVISIBLE_CHARS_RE, "");
}

export function normalizeWhitespace(input: string): string {
  return stripInvisibleCharacters(input)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripHtml(input: string): string {
  return normalizeWhitespace((input ?? "").replace(HTML_TAG_RE, ""));
}

export function sanitizeUserText(input: string, maxLength?: number): string {
  const clean = stripHtml(input);
  return typeof maxLength === "number" ? clean.slice(0, maxLength).trim() : clean;
}

export function containsUnsafeMarkup(input: string): boolean {
  const text = input ?? "";
  return HTML_TAG_RE.test(text) || SCRIPTISH_RE.test(text);
}

export function sanitizeTag(input: string): string {
  return stripInvisibleCharacters(input)
    .toLowerCase()
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function sanitizeUsername(input: string): string {
  return stripInvisibleCharacters(input)
    .toLowerCase()
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export function validateSafeUrl(rawUrl: string, opts: { allowHttp?: boolean } = {}): SafeUrlResult {
  const value = stripInvisibleCharacters(rawUrl).trim();
  if (!value) return { ok: false, message: "This link type is not allowed.", reason: "empty-url" };
  if (value.length > 2048) return { ok: false, message: "This link is too long.", reason: "url-too-long" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: "Enter a valid link.", reason: "invalid-url" };
  }

  if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, message: "This link type is not allowed.", reason: "blocked-protocol" };
  }
  if (parsed.protocol === "http:" && opts.allowHttp === false) {
    return { ok: false, message: "Use an https link.", reason: "http-not-allowed" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, message: "Links with embedded credentials are not allowed.", reason: "credentials-in-url" };
  }
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    return { ok: false, message: "This link type is not allowed.", reason: "non-standard-port" };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || PRIVATE_HOST_RE.test(host) || isPrivateOrReservedIp(host)) {
    return { ok: false, message: "This link type is not allowed.", reason: "private-host" };
  }
  if (looksLikePhishingHost(host)) {
    return { ok: false, message: "This link looks suspicious.", reason: "suspicious-host" };
  }

  parsed.hash = "";
  return { ok: true, url: parsed.toString() };
}

export function isPrivateOrReservedIp(host: string): boolean {
  const ip = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 0 || b === 168)) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    if (a >= 224) return true;
    return false;
  }

  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") return true;
  const v4mapped = ip.match(/^::ffff:([\d.]+)$/);
  if (v4mapped) return isPrivateOrReservedIp(v4mapped[1]);
  if (/^f[cd][0-9a-f]{2}:/.test(ip)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(ip)) return true;
  if (/^ff[0-9a-f]{2}:/.test(ip)) return true;
  return false;
}

function looksLikePhishingHost(host: string): boolean {
  if (host.includes("..")) return true;
  if (host.length > 253) return true;
  if (/(paypal|google|microsoft|apple|openai|firebase|vercel|github)[-.].*\.(zip|mov|click|country|tk|ml)$/i.test(host)) return true;
  if (/[^\x00-\x7f]/.test(host)) return true;
  return false;
}
