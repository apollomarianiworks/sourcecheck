import { NextRequest, NextResponse } from "next/server";
import { extractSocialMetadata } from "@/lib/social/extract-social-metadata";
import { scoreSocialSource } from "@/lib/social/social-score";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import { validateSafeUrl } from "@/lib/security/sanitize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "sourceMeshScan");
  } catch (error) {
    if (error instanceof SecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }

  let body: { url?: string; claimText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url?.trim()) return NextResponse.json({ error: "url is required" }, { status: 400 });
  const safeUrl = validateSafeUrl(body.url);
  if (!safeUrl.ok || !safeUrl.url) return NextResponse.json({ error: safeUrl.message ?? "This link type is not allowed." }, { status: 400 });

  const metadata = await extractSocialMetadata(safeUrl.url);
  const sourceQuality = scoreSocialSource(metadata, body.claimText ?? "");
  return NextResponse.json({
    metadata,
    sourceQuality,
    claimEvidenceNote: "Social metadata is source context only. It is not independent evidence that the claim is true.",
  });
}
