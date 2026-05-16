import { NextRequest, NextResponse } from "next/server";
import { buildDebateBrief } from "@/lib/debate/brief";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = body.topic?.trim() ?? "";
  if (topic.length < 3) return NextResponse.json({ error: "topic must be at least 3 characters" }, { status: 400 });
  if (topic.length > 500) return NextResponse.json({ error: "topic must be under 500 characters" }, { status: 400 });

  try {
    return NextResponse.json(await buildDebateBrief(topic));
  } catch (error) {
    console.error("[/api/debate/brief] error:", error);
    return NextResponse.json({ error: "Debate brief failed. Try a narrower topic." }, { status: 502 });
  }
}
