import type { NextRequest } from "next/server";

export type GuardAction =
  | "post"
  | "comment"
  | "like"
  | "save"
  | "follow"
  | "report"
  | "sourceMeshScan"
  | "routineRun"
  | "profileUpdate"
  | "extractUrl"
  | "aiAssist";

interface LimitRule {
  windowMs: number;
  max: number;
  label: string;
}

export const RATE_LIMITS: Record<GuardAction, LimitRule> = {
  post: { windowMs: 60 * 60 * 1000, max: 5, label: "posts per hour" },
  comment: { windowMs: 60 * 60 * 1000, max: 30, label: "comments per hour" },
  like: { windowMs: 60 * 60 * 1000, max: 120, label: "likes per hour" },
  save: { windowMs: 60 * 60 * 1000, max: 120, label: "saves per hour" },
  follow: { windowMs: 60 * 60 * 1000, max: 60, label: "follows per hour" },
  report: { windowMs: 24 * 60 * 60 * 1000, max: 20, label: "reports per day" },
  sourceMeshScan: { windowMs: 60 * 60 * 1000, max: 60, label: "SourceMesh scans per hour" },
  routineRun: { windowMs: 60 * 60 * 1000, max: 20, label: "routine runs per hour" },
  profileUpdate: { windowMs: 60 * 60 * 1000, max: 10, label: "profile updates per hour" },
  extractUrl: { windowMs: 60 * 1000, max: 20, label: "URL extractions per minute" },
  aiAssist: { windowMs: 60 * 1000, max: 20, label: "assistant requests per minute" },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
  message?: string;
}

interface Bucket {
  hits: number[];
}

const serverBuckets = new Map<string, Bucket>();
const CLIENT_KEY = "proofbase.guard.rateLimits.v1";

export function keyFromRequest(req: NextRequest, action: GuardAction): string {
  return `${action}:${ipFromRequest(req)}`;
}

export function ipFromRequest(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "anonymous";
  return req.headers.get("x-real-ip")?.trim() || "anonymous";
}

export function checkServerRateLimit(key: string, action: GuardAction): RateLimitResult {
  return checkMapBucket(serverBuckets, key, RATE_LIMITS[action]);
}

export function pruneServerRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of serverBuckets.entries()) {
    if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > 24 * 60 * 60 * 1000) {
      serverBuckets.delete(key);
    }
  }
}

export function checkClientRateLimit(userId: string, action: GuardAction): RateLimitResult {
  if (typeof window === "undefined") {
    return { allowed: true, remaining: RATE_LIMITS[action].max, resetMs: RATE_LIMITS[action].windowMs, retryAfterSeconds: 0 };
  }
  const log = readClientLog();
  const key = `${userId}:${action}`;
  const bucket = log[key] ?? { hits: [] };
  const result = checkBucket(bucket, RATE_LIMITS[action]);
  log[key] = bucket;
  writeClientLog(log);
  return result;
}

function checkMapBucket(map: Map<string, Bucket>, key: string, rule: LimitRule): RateLimitResult {
  const bucket = map.get(key) ?? { hits: [] };
  const result = checkBucket(bucket, rule);
  map.set(key, bucket);
  return result;
}

function checkBucket(bucket: Bucket, rule: LimitRule): RateLimitResult {
  const now = Date.now();
  const cutoff = now - rule.windowMs;
  bucket.hits = bucket.hits.filter((hit) => hit >= cutoff);
  if (bucket.hits.length >= rule.max) {
    const resetMs = Math.max(0, bucket.hits[0] + rule.windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds: Math.ceil(resetMs / 1000),
      message: "This action is temporarily limited.",
    };
  }
  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, rule.max - bucket.hits.length),
    resetMs: rule.windowMs,
    retryAfterSeconds: 0,
  };
}

function readClientLog(): Record<string, Bucket> {
  try {
    const raw = window.localStorage.getItem(CLIENT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as Record<string, Bucket> : {};
  } catch {
    return {};
  }
}

function writeClientLog(log: Record<string, Bucket>): void {
  try { window.localStorage.setItem(CLIENT_KEY, JSON.stringify(log)); } catch { /* ignore */ }
}
