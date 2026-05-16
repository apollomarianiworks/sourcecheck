import { NextRequest, NextResponse } from "next/server";
import { buildEvidenceContext } from "@/lib/ai/evidence-context";
import { getProofbaseAIProvider, configuredProviderStatus } from "@/lib/ai/provider";
import type { ProofbaseAIRequest } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: ProofbaseAIRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const context = buildEvidenceContext({
    mode: body.mode ?? "research-assistant",
    question: body.question,
    checkResult: body.checkResult ?? null,
    sourceMesh: body.sourceMesh ?? null,
    userText: body.userText,
    collectionNotes: body.collectionNotes,
  });
  const provider = getProofbaseAIProvider();
  const response = await provider.assist(context, body.question);

  return NextResponse.json({
    ...response,
    providerStatus: configuredProviderStatus(),
  });
}
