import type { AbuseSignal } from "./abuse-detection";
import type { GuardAction } from "./rate-limits";

export type ModerationAction =
  | "mark-under-review"
  | "remove-content"
  | "restore-content"
  | "restrict-user"
  | "clear-restriction"
  | "resolve-report"
  | "dismiss-report";

export interface AuditLogEvent {
  id: string;
  action: GuardAction | ModerationAction | "auth-required" | "unsafe-url" | "protected-field-edit" | "api-error";
  actorId: string | null;
  targetType?: "user" | "claim" | "comment" | "collection" | "routine" | "report" | "api";
  targetId?: string | null;
  message: string;
  signals?: AbuseSignal[];
  createdAt: string;
  severity: "info" | "warning" | "critical";
  metadata?: Record<string, string | number | boolean | null>;
}

const AUDIT_KEY = "proofbase.security.audit.v1";

export function createAuditEvent(input: Omit<AuditLogEvent, "id" | "createdAt">): AuditLogEvent {
  return {
    ...input,
    id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}

export function logAuditEvent(input: Omit<AuditLogEvent, "id" | "createdAt">): AuditLogEvent {
  const event = createAuditEvent(input);
  if (event.severity === "critical") {
    console.error("[security-audit]", event);
  } else {
    console.warn("[security-audit]", event);
  }
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(AUDIT_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(rows) ? [event, ...rows].slice(0, 200) : [event];
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
    } catch {
      // Best-effort local audit only. Server-side audit collection should be added with Admin SDK.
    }
  }
  return event;
}
