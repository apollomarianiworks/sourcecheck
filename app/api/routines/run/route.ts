import { NextRequest, NextResponse } from "next/server";
import { runRoutine } from "@/lib/routines/run-routine";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import { validateRoutineInput } from "@/lib/security/validators";
import type { ProofbaseRoutine } from "@/lib/routines/types";
import type { SourceMeshConfidenceLabel } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "routineRun");
  } catch (error) {
    if (error instanceof SecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }

  let body: { routine?: ProofbaseRoutine; previousConfidence?: SourceMeshConfidenceLabel | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.routine?.prompt?.trim()) {
    return NextResponse.json({ error: "Routine prompt is required." }, { status: 400 });
  }
  const validation = validateRoutineInput({
    prompt: body.routine.prompt,
    description: body.routine.description,
  });
  if (!validation.ok) return NextResponse.json({ error: validation.message ?? "Invalid routine." }, { status: 400 });

  try {
    const result = await runRoutine(body.routine, { previousConfidence: body.previousConfidence ?? null });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/routines/run] error:", error);
    return NextResponse.json({ error: "Routine failed. Try again shortly." }, { status: 502 });
  }
}
