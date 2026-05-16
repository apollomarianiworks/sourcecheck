import { validateSafeUrl } from "./sanitize";

export type AbuseSignalKind =
  | "repeated-content"
  | "link-spam"
  | "duplicate-evidence"
  | "suspicious-username"
  | "impersonation-username"
  | "unsupported-claim"
  | "low-quality-source-flood"
  | "excessive-reports"
  | "mass-following"
  | "mass-liking"
  | "unsafe-url"
  | "unsafe-markup";

export interface AbuseSignal {
  kind: AbuseSignalKind;
  severity: "low" | "medium" | "high";
  message: string;
  reviewRecommended?: boolean;
}

const RESERVED_NAMES = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "support",
  "proofbase",
  "proofmedia",
  "firebase",
  "vercel",
  "openai",
];

export function contentFingerprint(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

export function detectDuplicateEvidence(urls: string[]): AbuseSignal[] {
  const seen = new Set<string>();
  const signals: AbuseSignal[] = [];
  for (const url of urls) {
    const safe = validateSafeUrl(url);
    if (!safe.ok) {
      signals.push({ kind: "unsafe-url", severity: "high", message: safe.message ?? "This link type is not allowed." });
      continue;
    }
    const key = safe.url?.toLowerCase() ?? url.toLowerCase();
    if (seen.has(key)) {
      signals.push({ kind: "duplicate-evidence", severity: "medium", message: "Duplicate evidence link." });
    }
    seen.add(key);
  }
  return signals;
}

export function detectLinkSpam(text: string, urls: string[]): AbuseSignal[] {
  const linkCount = (text.match(/https?:\/\//gi) ?? []).length + urls.length;
  const uniqueHosts = new Set<string>();
  for (const url of urls) {
    try { uniqueHosts.add(new URL(url).hostname.replace(/^www\./, "")); } catch { /* ignored */ }
  }
  if (linkCount >= 8) {
    return [{ kind: "link-spam", severity: "high", message: "This has too many links to post at once.", reviewRecommended: true }];
  }
  if (urls.length >= 4 && uniqueHosts.size <= 1) {
    return [{ kind: "low-quality-source-flood", severity: "medium", message: "Too many links from the same source.", reviewRecommended: true }];
  }
  return [];
}

export function detectSuspiciousUsername(username: string): AbuseSignal[] {
  const value = username.toLowerCase();
  const compact = value.replace(/[^a-z0-9]/g, "");
  const signals: AbuseSignal[] = [];
  if (RESERVED_NAMES.includes(compact)) {
    signals.push({ kind: "impersonation-username", severity: "high", message: "This username is reserved." });
  } else if (RESERVED_NAMES.some((name) => compact.includes(name) && compact !== name)) {
    signals.push({ kind: "suspicious-username", severity: "medium", message: "This username could be confused with an official account.", reviewRecommended: true });
  }
  if (/(.)\1{4,}/.test(value) || /^\d+$/.test(value)) {
    signals.push({ kind: "suspicious-username", severity: "medium", message: "Choose a less spam-like username." });
  }
  return signals;
}

export function looksLikeRepeatedContent(current: string, recentFingerprints: string[]): boolean {
  const fp = contentFingerprint(current);
  return fp.length >= 40 && recentFingerprints.includes(fp);
}

export function looksUnsupportedClaimSpam(body: string, evidenceUrls: string[]): boolean {
  const text = body.toLowerCase();
  const hype = /(breaking|shocking|they don't want you to know|secret cure|guaranteed|100% true)/i.test(text);
  return evidenceUrls.length === 0 && hype;
}
