import type { User } from "firebase/auth";
import type { NextRequest } from "next/server";
import { logAuditEvent } from "./audit-log";
import { containsProtectedFields, PROTECTED_CONTENT_FIELDS, PROTECTED_USER_FIELDS, canWriteWithRestrictions } from "./permissions";
import { checkClientRateLimit, checkServerRateLimit, keyFromRequest, pruneServerRateLimits, type GuardAction } from "./rate-limits";

export const SECURITY_MESSAGES = {
  signIn: "You need to sign in.",
  verifyEmail: "Verify your email before posting.",
  limited: "This action is temporarily limited.",
  linkBlocked: "This link type is not allowed.",
  spam: "This post looks like spam.",
  cannotEdit: "You cannot edit this content.",
  underReview: "This content is under review.",
  unsafeInput: "This content contains unsafe input.",
  serverError: "Something went wrong. Try again shortly.",
};

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
    public field?: string,
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

export interface GuardUserState {
  uid: string;
  emailVerified?: boolean;
  role?: "user" | "moderator" | "admin";
  restrictions?: string[];
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof SecurityError) return error.message;
  if (error instanceof Error && /^(Invalid|Username|Display name|Bio|This link|You cannot|Your account|Verify your email|You need to sign in|This action is temporarily limited|That email|Incorrect password|No account|Password must|Sign-in popup|Your browser|Network error|Too many attempts|Authentication failed|This domain)/i.test(error.message)) {
    return error.message;
  }
  if (error instanceof Error && /^Firebase: Error \(auth\//.test(error.message)) return "Authentication failed. Check your sign-in details.";
  if (error instanceof Error && /permission-denied|Missing or insufficient permissions/i.test(error.message)) return SECURITY_MESSAGES.cannotEdit;
  if (error instanceof Error && /index|FAILED_PRECONDITION|requires an index|create it here/i.test(error.message)) {
    console.warn("[firestore-index-needed]", error.message);
    return "This view needs a database index before it can load. The raw setup link was hidden for safety.";
  }
  return SECURITY_MESSAGES.serverError;
}

export function requireClientUser(user: User | null | undefined): User {
  if (!user) throw new SecurityError(SECURITY_MESSAGES.signIn, "auth-required", 401);
  return user;
}

export function guardClientAction(args: {
  user: User | null | undefined;
  action: GuardAction;
  requireVerifiedEmail?: boolean;
  restrictions?: string[];
}): User {
  const user = requireClientUser(args.user);
  if (args.requireVerifiedEmail && !user.emailVerified) {
    logAuditEvent({
      action: args.action,
      actorId: user.uid,
      message: "Blocked unverified account from protected public write.",
      severity: "warning",
      targetType: "user",
      targetId: user.uid,
    });
    throw new SecurityError(SECURITY_MESSAGES.verifyEmail, "email-unverified", 403);
  }
  if (!canWriteWithRestrictions(args.restrictions, actionToRestriction(args.action))) {
    throw new SecurityError("Your account is restricted from this action.", "account-restricted", 403);
  }
  const rate = checkClientRateLimit(user.uid, args.action);
  if (!rate.allowed) {
    logAuditEvent({
      action: args.action,
      actorId: user.uid,
      message: `Client rate limit exceeded for ${args.action}.`,
      severity: "warning",
      targetType: "user",
      targetId: user.uid,
    });
    throw new SecurityError(SECURITY_MESSAGES.limited, "rate-limited", 429);
  }
  return user;
}

export function guardApiAction(req: NextRequest, action: GuardAction): void {
  pruneServerRateLimits();
  const rate = checkServerRateLimit(keyFromRequest(req, action), action);
  if (!rate.allowed) {
    throw new SecurityError(SECURITY_MESSAGES.limited, "rate-limited", 429);
  }
}

export function assertNoProtectedUserFields(patch: Record<string, unknown>): void {
  const fields = containsProtectedFields(patch, PROTECTED_USER_FIELDS);
  if (fields.length > 0) {
    logAuditEvent({
      action: "protected-field-edit",
      actorId: null,
      targetType: "user",
      message: `Blocked protected profile field edit: ${fields.join(", ")}`,
      severity: "critical",
    });
    throw new SecurityError(SECURITY_MESSAGES.cannotEdit, "protected-field", 403);
  }
}

export function assertNoProtectedContentFields(patch: Record<string, unknown>): void {
  const fields = containsProtectedFields(patch, PROTECTED_CONTENT_FIELDS);
  if (fields.length > 0) {
    logAuditEvent({
      action: "protected-field-edit",
      actorId: null,
      targetType: "claim",
      message: `Blocked protected content field edit: ${fields.join(", ")}`,
      severity: "critical",
    });
    throw new SecurityError(SECURITY_MESSAGES.cannotEdit, "protected-field", 403);
  }
}

function actionToRestriction(action: GuardAction): "post" | "comment" | "like" | "save" | "follow" | "report" | "profile-edit" | "routine-run" {
  if (action === "profileUpdate") return "profile-edit";
  if (action === "routineRun") return "routine-run";
  if (action === "post") return "post";
  if (action === "comment") return "comment";
  if (action === "like") return "like";
  if (action === "save") return "save";
  if (action === "follow") return "follow";
  if (action === "report") return "report";
  return "post";
}
