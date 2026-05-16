import { NextRequest, NextResponse } from "next/server";
import { runRoutine } from "@/lib/routines/run-routine";
import type { ProofbaseRoutine } from "@/lib/routines/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { routine?: ProofbaseRoutine };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.routine?.prompt?.trim()) {
    return NextResponse.json({ error: "Routine prompt is required." }, { status: 400 });
  }

  try {
    const result = await runRoutine(body.routine);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Routine failed." }, { status: 502 });
  }
}
