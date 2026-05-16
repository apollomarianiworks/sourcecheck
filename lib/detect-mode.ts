import type { CheckMode } from "./types";

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\.?$/i;

/**
 * Heuristic: auto-detect which mode best fits a raw search input.
 *
 *  - http:// or https:// → "url"
 *  - looks like a bare domain (single token, has a TLD)  → "domain"
 *  - otherwise → "claim"
 */
export function detectMode(raw: string): CheckMode {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "claim";

  if (/^https?:\/\//i.test(trimmed)) return "url";

  // Single-token / no whitespace AND matches a domain pattern
  if (!/\s/.test(trimmed) && DOMAIN_RE.test(trimmed.replace(/^www\./i, ""))) {
    return "domain";
  }

  // www.example.com without protocol
  if (!/\s/.test(trimmed) && /^www\./i.test(trimmed)) return "domain";

  return "claim";
}
