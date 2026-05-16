import { detectDuplicateEvidence, detectLinkSpam, detectSuspiciousUsername, looksUnsupportedClaimSpam } from "./abuse-detection";
import { containsUnsafeMarkup, sanitizeTag, sanitizeUserText, sanitizeUsername, validateSafeUrl } from "./sanitize";

export interface ValidationResult<T = unknown> {
  ok: boolean;
  value?: T;
  message?: string;
  field?: string;
}

export const LIMITS = {
  usernameMin: 3,
  usernameMax: 24,
  displayNameMin: 1,
  displayNameMax: 50,
  postTitleMin: 8,
  postTitleMax: 180,
  postBodyMax: 5000,
  commentBodyMin: 5,
  commentBodyMax: 2000,
  bioMax: 300,
  evidenceLinksMax: 5,
  tagsMax: 10,
  tagMax: 30,
  routineDescriptionMax: 1000,
  routinePromptMax: 1000,
  collectionTitleMax: 120,
  collectionDescriptionMax: 1000,
  profileUrlMax: 2048,
};

export function fail(message: string, field?: string): ValidationResult<never> {
  return { ok: false, message, field };
}

export function validatePlainText(
  value: string,
  opts: { field: string; label: string; min?: number; max: number; required?: boolean },
): ValidationResult<string> {
  if (containsUnsafeMarkup(value)) return fail(`${opts.label} contains unsafe markup.`, opts.field);
  const clean = sanitizeUserText(value, opts.max);
  if (opts.required && clean.length === 0) return fail(`${opts.label} is required.`, opts.field);
  if (opts.min && clean.length < opts.min) return fail(`${opts.label} must be at least ${opts.min} characters.`, opts.field);
  if (clean.length > opts.max) return fail(`${opts.label} is too long (${opts.max} max).`, opts.field);
  return { ok: true, value: clean };
}

export function validateUsername(value: string): ValidationResult<string> {
  const username = sanitizeUsername(value);
  if (username.length < LIMITS.usernameMin || username.length > LIMITS.usernameMax) {
    return fail(`Username must be ${LIMITS.usernameMin}-${LIMITS.usernameMax} characters.`, "username");
  }
  if (!/^[a-z0-9][a-z0-9_-]{1,22}[a-z0-9]$/.test(username)) {
    return fail("Username can use letters, numbers, underscores, and dashes.", "username");
  }
  const signal = detectSuspiciousUsername(username)[0];
  if (signal?.severity === "high") return fail(signal.message, "username");
  return { ok: true, value: username };
}

export function validateDisplayName(value: string): ValidationResult<string> {
  return validatePlainText(value, {
    field: "displayName",
    label: "Display name",
    min: LIMITS.displayNameMin,
    max: LIMITS.displayNameMax,
    required: true,
  });
}

export function validateBio(value: string): ValidationResult<string> {
  return validatePlainText(value, { field: "bio", label: "Bio", max: LIMITS.bioMax });
}

export function validateProfileUrl(value: string): ValidationResult<string | null> {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  const safe = validateSafeUrl(trimmed, { allowHttp: false });
  if (!safe.ok) return fail(safe.message ?? "This link type is not allowed.", "url");
  return { ok: true, value: safe.url };
}

export function validateTagsInput(tags: string[]): ValidationResult<string[]> {
  if (!Array.isArray(tags)) return fail("Tags must be a list.", "tags");
  if (tags.length > LIMITS.tagsMax) return fail(`Up to ${LIMITS.tagsMax} tags.`, "tags");
  const clean = tags.map(sanitizeTag).filter(Boolean);
  if (clean.length !== new Set(clean).size) return fail("Duplicate tags are not allowed.", "tags");
  for (const tag of clean) {
    if (tag.length > LIMITS.tagMax || !/^[a-z0-9][a-z0-9-]{0,29}$/.test(tag)) {
      return fail(`Tag "${tag}" must be alphanumeric with dashes.`, "tags");
    }
  }
  return { ok: true, value: clean };
}

export function validateEvidenceUrlsInput(urls: string[]): ValidationResult<string[]> {
  if (!Array.isArray(urls)) return fail("Evidence must be a list.", "evidenceUrls");
  if (urls.length > LIMITS.evidenceLinksMax) return fail(`Up to ${LIMITS.evidenceLinksMax} evidence links.`, "evidenceUrls");
  const signals = detectDuplicateEvidence(urls);
  const blocking = signals.find((signal) => signal.severity === "high" || signal.kind === "duplicate-evidence");
  if (blocking) return fail(blocking.message, "evidenceUrls");
  const clean: string[] = [];
  for (const url of urls) {
    const safe = validateSafeUrl(url);
    if (!safe.ok || !safe.url) return fail(safe.message ?? "This link type is not allowed.", "evidenceUrls");
    clean.push(safe.url);
  }
  return { ok: true, value: clean };
}

export function validatePostInput(input: {
  title: string;
  body?: string;
  tags: string[];
  evidenceUrls: string[];
}): ValidationResult<{ title: string; body: string; tags: string[]; evidenceUrls: string[]; needsReview: boolean }> {
  const title = validatePlainText(input.title, {
    field: "title",
    label: "Title",
    min: LIMITS.postTitleMin,
    max: LIMITS.postTitleMax,
    required: true,
  });
  if (!title.ok || !title.value) return fail(title.message ?? "Invalid title.", title.field);
  const body = validatePlainText(input.body ?? "", { field: "body", label: "Body", max: LIMITS.postBodyMax });
  if (!body.ok) return fail(body.message ?? "Invalid body.", body.field);
  const tags = validateTagsInput(input.tags);
  if (!tags.ok || !tags.value) return fail(tags.message ?? "Invalid tags.", tags.field);
  const evidenceUrls = validateEvidenceUrlsInput(input.evidenceUrls);
  if (!evidenceUrls.ok || !evidenceUrls.value) return fail(evidenceUrls.message ?? "Invalid evidence URLs.", evidenceUrls.field);
  const linkSpam = detectLinkSpam(`${title.value}\n${body.value ?? ""}`, evidenceUrls.value)[0];
  if (linkSpam?.severity === "high") return fail(linkSpam.message, "evidenceUrls");
  return {
    ok: true,
    value: {
      title: title.value,
      body: body.value ?? "",
      tags: tags.value,
      evidenceUrls: evidenceUrls.value,
      needsReview: Boolean(linkSpam?.reviewRecommended || looksUnsupportedClaimSpam(`${title.value}\n${body.value ?? ""}`, evidenceUrls.value)),
    },
  };
}

export function validateCommentInput(input: { body: string; evidenceUrls: string[] }): ValidationResult<{ body: string; evidenceUrls: string[] }> {
  const body = validatePlainText(input.body, {
    field: "body",
    label: "Comment",
    min: LIMITS.commentBodyMin,
    max: LIMITS.commentBodyMax,
    required: true,
  });
  if (!body.ok || !body.value) return fail(body.message ?? "Invalid comment.", body.field);
  const evidenceUrls = validateEvidenceUrlsInput(input.evidenceUrls);
  if (!evidenceUrls.ok || !evidenceUrls.value) return fail(evidenceUrls.message ?? "Invalid evidence URLs.", evidenceUrls.field);
  return { ok: true, value: { body: body.value, evidenceUrls: evidenceUrls.value } };
}

export function validateRoutineInput(input: { prompt: string; description?: string }): ValidationResult<{ prompt: string; description: string }> {
  const prompt = validatePlainText(input.prompt, {
    field: "prompt",
    label: "Routine prompt",
    max: LIMITS.routinePromptMax,
    required: true,
  });
  if (!prompt.ok || !prompt.value) return fail(prompt.message ?? "Invalid routine prompt.", prompt.field);
  const description = validatePlainText(input.description ?? "", {
    field: "description",
    label: "Routine description",
    max: LIMITS.routineDescriptionMax,
  });
  if (!description.ok) return fail(description.message ?? "Invalid routine description.", description.field);
  return { ok: true, value: { prompt: prompt.value, description: description.value ?? "" } };
}

export function validateCollectionInput(input: { title: string; description?: string }): ValidationResult<{ title: string; description: string }> {
  const title = validatePlainText(input.title, {
    field: "title",
    label: "Collection title",
    min: 1,
    max: LIMITS.collectionTitleMax,
    required: true,
  });
  if (!title.ok || !title.value) return fail(title.message ?? "Invalid collection title.", title.field);
  const description = validatePlainText(input.description ?? "", {
    field: "description",
    label: "Collection description",
    max: LIMITS.collectionDescriptionMax,
  });
  if (!description.ok) return fail(description.message ?? "Invalid collection description.", description.field);
  return { ok: true, value: { title: title.value, description: description.value ?? "" } };
}
