export type ProofbaseRole = "user" | "moderator" | "admin";

export type UserRestriction =
  | "banned"
  | "no-post"
  | "no-comment"
  | "no-like"
  | "no-save"
  | "no-follow"
  | "no-report"
  | "no-profile-edit"
  | "no-routine-run"
  | "needs-review";

export const PROTECTED_USER_FIELDS = [
  "role",
  "restrictions",
  "reputationScore",
  "followerCount",
  "followingCount",
  "postCount",
  "likeCount",
  "status",
  "moderationStatus",
] as const;

export const PROTECTED_CONTENT_FIELDS = [
  "authorId",
  "authorUsername",
  "authorDisplayName",
  "authorPhotoURL",
  "status",
  "moderationStatus",
  "score",
  "likeCount",
  "saveCount",
  "commentCount",
  "reportCount",
  "createdAt",
] as const;

export type ProtectedUserField = typeof PROTECTED_USER_FIELDS[number];
export type ProtectedContentField = typeof PROTECTED_CONTENT_FIELDS[number];

export function isModeratorRole(role: ProofbaseRole | undefined): boolean {
  return role === "moderator" || role === "admin";
}

export function hasRestriction(restrictions: readonly string[] | undefined, restriction: UserRestriction): boolean {
  return Array.isArray(restrictions) && restrictions.includes(restriction);
}

export function canWriteWithRestrictions(
  restrictions: readonly string[] | undefined,
  action: "post" | "comment" | "like" | "save" | "follow" | "report" | "profile-edit" | "routine-run",
): boolean {
  if (hasRestriction(restrictions, "banned")) return false;
  return !hasRestriction(restrictions, `no-${action}` as UserRestriction);
}

export function isOwner(uid: string | null | undefined, ownerId: string | null | undefined): boolean {
  return Boolean(uid && ownerId && uid === ownerId);
}

export function changedProtectedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[],
): string[] {
  return fields.filter((field) => field in after && JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

export function containsProtectedFields(patch: Record<string, unknown>, fields: readonly string[]): string[] {
  return fields.filter((field) => field in patch);
}
