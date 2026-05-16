import { NextRequest, NextResponse } from "next/server";
import { understandQuery, generateSearchVariants } from "@/lib/sourcemesh/query-understanding";
import { buildFollowups } from "@/lib/sourcemesh/followups";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.input?.trim()) return NextResponse.json({ error: "input is required" }, { status: 400 });
  const understanding = understandQuery(body.input);
  const variants = generateSearchVariants(understanding);
  const followups = buildFollowups(understanding, variants);
  return NextResponse.json({ understanding, variants, followups });
}
