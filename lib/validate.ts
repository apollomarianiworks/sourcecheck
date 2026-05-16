import type { CheckMode } from "./types";

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2}[a-z]*$/i;

export function validateInput(mode: CheckMode, raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, message: "Input is empty." };

  if (mode === "claim") {
    if (trimmed.length < 3) {
      return { ok: false, message: "Claim must be at least 3 characters." };
    }
    if (trimmed.length > 2000) {
      return { ok: false, message: "Claim exceeds 2000 characters." };
    }
    return { ok: true };
  }

  if (mode === "url") {
    return validateUrl(trimmed);
  }

  if (mode === "domain") {
    return validateDomain(trimmed);
  }

  return { ok: false, message: "Unknown mode." };
}

function validateUrl(raw: string): ValidationResult {
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      ok: false,
      message: "Not a valid URL. Example: https://example.com/article",
    };
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return { ok: false, message: "Only http and https URLs are supported." };
  }

  const host = parsed.hostname.replace(/^www\./i, "");
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".local")) {
    return { ok: false, message: "Local/private hosts cannot be scanned." };
  }

  if (!DOMAIN_RE.test(host)) {
    return { ok: false, message: `Hostname "${host}" does not look like a public domain.` };
  }

  return { ok: true };
}

function validateDomain(raw: string): ValidationResult {
  const cleaned = raw
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[\/\?#]/)[0]
    .trim();

  if (cleaned.length === 0) return { ok: false, message: "Domain is empty." };
  if (cleaned === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(cleaned)) {
    return { ok: false, message: "Local/private hosts cannot be scanned." };
  }
  if (!DOMAIN_RE.test(cleaned)) {
    return {
      ok: false,
      message: `"${cleaned}" is not a valid domain. Example: reuters.com`,
    };
  }
  return { ok: true };
}
