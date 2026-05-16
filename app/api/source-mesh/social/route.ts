import { NextRequest, NextResponse } from "next/server";
import { extractSocialMetadata } from "@/lib/social/extract-social-metadata";
import { scoreSocialSource } from "@/lib/social/social-score";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { url?: string; claimText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url?.trim()) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const metadata = await extractSocialMetadata(body.url);
  const sourceQuality = scoreSocialSource(metadata, body.claimText ?? "");
  return NextResponse.json({
    metadata,
    sourceQuality,
    claimEvidenceNote: "Social metadata is source context only. It is not independent evidence that the claim is true.",
  });
}
