import { NextRequest, NextResponse } from "next/server";
import { understandQuery, generateSearchVariants } from "@/lib/sourcemesh/query-understanding";
import { buildFollowups } from "@/lib/sourcemesh/followups";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import { validatePlainText } from "@/lib/security/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "sourceMeshScan");
  } catch (error) {
    if (error instanceof SecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }

  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.input?.trim()) return NextResponse.json({ error: "input is required" }, { status: 400 });
  const input = validatePlainText(body.input, { field: "input", label: "Input", max: 1000, required: true });
  if (!input.ok || !input.value) return NextResponse.json({ error: input.message ?? "Invalid input." }, { status: 400 });
  const understanding = understandQuery(input.value);
  const variants = generateSearchVariants(understanding);
  const followups = buildFollowups(understanding, variants);
  return NextResponse.json({ understanding, variants, followups });
}
