/**
 * Hard validation for ProofMedia content.
 *
 * Enforced client-side AND mirrored in firestore.rules (where possible) so a
 * malicious client can't bypass simply by hand-crafting a write.
 *
 * No "soft warnings" — anything that returns ok=false is rejected by the
 * composer; the user must fix the input before publishing.
 */

export const MIN_TITLE_LENGTH      = 8;
export const MAX_TITLE_LENGTH      = 180;
export const MAX_BODY_LENGTH       = 5_000;
export const MAX_EVIDENCE_LINKS    = 5;
export const MAX_TAGS              = 10;
export const MAX_TAG_LENGTH        = 30;
export const MAX_COMMENT_LENGTH    = 2_000;
export const MIN_COMMENT_LENGTH    = 5;
export const MAX_REPORT_LENGTH     = 1_000;
export const MIN_REPORT_LENGTH     = 10;
export const ALLOWED_CATEGORIES = [
  "politics-news",
  "health-medical",
  "science-research",
  "legal-court",
  "finance-business",
  "technology",
  "celebrity-viral",
  "general",
] as const;
export type ClaimCategoryId = typeof ALLOWED_CATEGORIES[number];

export const ALLOWED_VISIBILITIES = ["public", "private", "draft"] as const;
export type ClaimVisibility = typeof ALLOWED_VISIBILITIES[number];

export const ALLOWED_COMMENT_TYPES = ["comment", "rebuttal", "context"] as const;
export type CommentType = typeof ALLOWED_COMMENT_TYPES[number];

export interface ValidationResult { ok: boolean; message?: string; field?: string; }

const URL_RE = /^https?:\/\/[^\s<>"'`]+$/i;

export function validateUrl(url: string): ValidationResult {
  const u = (url ?? "").trim();
  if (!u)                  return { ok: false, message: "URL is required.", field: "url" };
  if (u.length > 2048)     return { ok: false, message: "URL is too long.", field: "url" };
  if (!URL_RE.test(u))     return { ok: false, message: "Must be a real http(s) URL.", field: "url" };
  return { ok: true };
}

export function validateTitle(title: string): ValidationResult {
  const t = (title ?? "").trim();
  if (t.length < MIN_TITLE_LENGTH) return { ok: false, field: "title", message: `Title must be at least ${MIN_TITLE_LENGTH} characters.` };
  if (t.length > MAX_TITLE_LENGTH) return { ok: false, field: "title", message: `Title is too long (${MAX_TITLE_LENGTH} max).` };
  return { ok: true };
}

export function validateBody(body: string, opts?: { required?: boolean; min?: number; max?: number }): ValidationResult {
  const b = (body ?? "").trim();
  const min = opts?.min ?? 0;
  const max = opts?.max ?? MAX_BODY_LENGTH;
  if (opts?.required && b.length === 0) return { ok: false, field: "body", message: "Body is required." };
  if (b.length < min) return { ok: false, field: "body", message: `Needs at least ${min} characters.` };
  if (b.length > max) return { ok: false, field: "body", message: `Too long — ${max} characters max.` };
  return { ok: true };
}

export function validateCategory(cat: string): ValidationResult {
  if (!ALLOWED_CATEGORIES.includes(cat as ClaimCategoryId))
    return { ok: false, field: "category", message: "Pick a category." };
  return { ok: true };
}

export function validateTags(tags: string[]): ValidationResult {
  if (!Array.isArray(tags)) return { ok: false, field: "tags", message: "Tags must be a list." };
  if (tags.length > MAX_TAGS) return { ok: false, field: "tags", message: `Up to ${MAX_TAGS} tags.` };
  for (const t of tags) {
    if (typeof t !== "string" || t.length === 0)
      return { ok: false, field: "tags", message: "Tags can't be empty." };
    if (t.length > MAX_TAG_LENGTH)
      return { ok: false, field: "tags", message: `Tag "${t.slice(0, 20)}…" is too long.` };
    if (!/^[a-z0-9][a-z0-9-]{0,29}$/i.test(t))
      return { ok: false, field: "tags", message: `Tag "${t}" must be alphanumeric with dashes.` };
  }
  return { ok: true };
}

export function validateEvidenceUrls(urls: string[]): ValidationResult {
  if (!Array.isArray(urls)) return { ok: false, field: "evidenceUrls", message: "Evidence must be a list." };
  if (urls.length > MAX_EVIDENCE_LINKS)
    return { ok: false, field: "evidenceUrls", message: `Up to ${MAX_EVIDENCE_LINKS} evidence links.` };
  const seen = new Set<string>();
  for (const u of urls) {
    const r = validateUrl(u);
    if (!r.ok) return r;
    const key = u.toLowerCase();
    if (seen.has(key)) return { ok: false, field: "evidenceUrls", message: "Duplicate evidence link." };
    seen.add(key);
  }
  return { ok: true };
}

/** Cheap spam check — repeated phrase or all-caps walls. */
export function looksLikeSpam(text: string): boolean {
  const t = (text ?? "").trim();
  if (t.length === 0) return false;
  // 5+ exclamation marks in a row
  if (/!{5,}/.test(t)) return true;
  // Walls of all-caps that aren't short acronyms
  const caps = (t.match(/[A-Z]/g) ?? []).length;
  if (t.length > 60 && caps / t.length > 0.6) return true;
  // Same word repeated 4+ times in a row
  if (/\b(\w{3,})\b(?:\s+\1\b){3,}/i.test(t)) return true;
  return false;
}

export interface ComposeClaim {
  title: string;
  body?: string;
  category: string;
  tags: string[];
  evidenceUrls: string[];
  visibility: string;
}

export function validateClaim(c: ComposeClaim): ValidationResult {
  const checks: ValidationResult[] = [
    validateTitle(c.title),
    validateBody(c.body ?? "", { required: false }),
    validateCategory(c.category),
    validateTags(c.tags),
    validateEvidenceUrls(c.evidenceUrls),
  ];
  for (const r of checks) if (!r.ok) return r;
  if (!ALLOWED_VISIBILITIES.includes(c.visibility as ClaimVisibility))
    return { ok: false, field: "visibility", message: "Invalid visibility." };
  if (looksLikeSpam(c.title) || looksLikeSpam(c.body ?? ""))
    return { ok: false, field: "title", message: "This looks like spam — please rephrase." };
  return { ok: true };
}

export interface ComposeComment {
  body: string;
  type: CommentType;
  evidenceUrls: string[];
}

export function validateComment(c: ComposeComment): ValidationResult {
  if (!ALLOWED_COMMENT_TYPES.includes(c.type))
    return { ok: false, field: "type", message: "Invalid comment type." };
  const body = validateBody(c.body, { required: true, min: MIN_COMMENT_LENGTH, max: MAX_COMMENT_LENGTH });
  if (!body.ok) return body;
  // Rebuttals and context notes MUST attach at least one source
  if ((c.type === "rebuttal" || c.type === "context") && c.evidenceUrls.length === 0)
    return { ok: false, field: "evidenceUrls", message: `${c.type === "rebuttal" ? "Rebuttals" : "Context notes"} require at least one source URL.` };
  const ev = validateEvidenceUrls(c.evidenceUrls);
  if (!ev.ok) return ev;
  if (looksLikeSpam(c.body))
    return { ok: false, field: "body", message: "This looks like spam — please rephrase." };
  return { ok: true };
}

export function validateReport(reason: string, details: string): ValidationResult {
  if (!reason) return { ok: false, field: "reason", message: "Pick a reason." };
  const d = (details ?? "").trim();
  if (d.length < MIN_REPORT_LENGTH) return { ok: false, field: "details", message: `Add at least ${MIN_REPORT_LENGTH} characters of detail.` };
  if (d.length > MAX_REPORT_LENGTH) return { ok: false, field: "details", message: `Too long — ${MAX_REPORT_LENGTH} max.` };
  return { ok: true };
}
