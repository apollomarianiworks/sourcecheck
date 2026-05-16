import type { NextRequest } from "next/server";

/**
 * In-memory sliding-window rate limiter. Per-IP. No persistence — this resets
 * whenever the server restarts, which is fine for a single-instance dev/demo
 * deployment. For production at scale, swap in Redis or Upstash.
 */

const WINDOW_MS = 60_000;   // 1 minute window
const MAX_PER_WINDOW = 30;  // 30 requests / minute / IP

interface Bucket {
  hits: number[];           // timestamps within the window
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;          // ms until the oldest hit expires
  retryAfterSeconds: number;
}

export function rateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const bucket = buckets.get(ip) ?? { hits: [] };

  // Drop expired hits
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) bucket.hits.shift();

  if (bucket.hits.length >= MAX_PER_WINDOW) {
    const oldest = bucket.hits[0];
    const resetMs = Math.max(0, (oldest + WINDOW_MS) - now);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds: Math.ceil(resetMs / 1000),
    };
  }

  bucket.hits.push(now);
  buckets.set(ip, bucket);

  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - bucket.hits.length,
    resetMs: WINDOW_MS,
    retryAfterSeconds: 0,
  };
}

export function ipFromRequest(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

/**
 * Periodically prune fully-expired buckets to keep memory bounded.
 * Called opportunistically on each request.
 */
export function pruneBuckets(): void {
  const now = Date.now();
  const cutoff = now - WINDOW_MS * 2;
  for (const [ip, bucket] of buckets.entries()) {
    if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < cutoff) {
      buckets.delete(ip);
    }
  }
}
