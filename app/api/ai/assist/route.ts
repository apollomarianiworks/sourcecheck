import { NextRequest, NextResponse } from "next/server";
import { buildEvidenceContext } from "@/lib/ai/evidence-context";
import { getProofbaseAIProvider, configuredProviderStatus } from "@/lib/ai/provider";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import { validatePlainText } from "@/lib/security/validators";
import type { ProofbaseAIRequest } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "aiAssist");
  } catch (error) {
    if (error instanceof SecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }

  let body: ProofbaseAIRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  const question = validatePlainText(body.question, { field: "question", label: "Question", max: 1000, required: true });
  if (!question.ok || !question.value) {
    return NextResponse.json({ error: question.message ?? "Invalid question." }, { status: 400 });
  }

  const context = buildEvidenceContext({
    mode: body.mode ?? "research-assistant",
    question: question.value,
    checkResult: body.checkResult ?? null,
    sourceMesh: body.sourceMesh ?? null,
    userText: body.userText,
    collectionNotes: body.collectionNotes,
  });
  const provider = getProofbaseAIProvider();
  const response = await provider.assist(context, question.value);

  return NextResponse.json({
    ...response,
    providerStatus: configuredProviderStatus(),
  });
}
