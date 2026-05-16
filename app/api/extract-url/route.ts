import { NextRequest, NextResponse } from "next/server";
import { extractFromUrl, ExtractError } from "@/lib/url-extractor";
import { rateLimit, ipFromRequest, pruneBuckets } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Body {
  url?: string;
}

export async function POST(req: NextRequest) {
  pruneBuckets();
  const ip = ipFromRequest(req);
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${rl.retryAfterSeconds} second(s).` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const url = body.url?.trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (url.length > 2048) return NextResponse.json({ error: "URL too long (max 2048 chars)." }, { status: 400 });

  try {
    const result = await extractFromUrl(url);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ExtractError) {
      // SSRF / validation errors → 400 (client should see them)
      const httpish = ["fetch-failed", "redirect-no-location", "redirect-bad-location", "unsupported-content-type", "too-many-redirects"];
      const status = httpish.includes(e.reason) ? 502 : 400;
      return NextResponse.json({ error: e.message, reason: e.reason, detail: e.detail }, { status });
    }
    console.error("[/api/extract-url] unexpected:", e);
    return NextResponse.json({ error: "Unexpected error extracting URL." }, { status: 500 });
  }
}
