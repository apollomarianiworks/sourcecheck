import type { EvidenceItem } from "@/lib/types";
import type { EvidenceContext, GroundedCitation, ProofbaseAIResponse } from "./types";
import { hasGrounding } from "./evidence-context";
import { MODE_LABELS, modeInstruction } from "./prompts";

export function buildCitationSafeResponse(context: EvidenceContext, question: string): ProofbaseAIResponse {
  const citations = evidenceCitations(context.evidence);
  const limitations = limitationsFor(context);
  const nextChecks = nextChecksFor(context, question);

  if (!hasGrounding(context)) {
    return {
      provider: "rule-based",
      mode: context.mode,
      answerSummary: "I do not have enough evidence yet. Run a SourceMesh check, add source URLs, or attach collection notes before asking for a grounded assistant answer.",
      evidenceUsed: [],
      confidenceLevel: "insufficient",
      limitations: ["No evidence, saved notes, user text, or public metadata was supplied to the assistant."],
      suggestedNextChecks: nextChecks,
      unsupportedClaims: [question],
    };
  }

  const strongest = context.sourceMesh?.evidenceMap.strongest.slice(0, 3) ?? context.evidence.slice(0, 3);
  const weak = context.sourceMesh?.evidenceMap.weakest.slice(0, 2) ?? [];
  const label = context.sourceMesh?.confidenceLabel ?? (citations.length > 0 ? "Evidence supplied" : "Context supplied");
  const summaryParts = [
    `${MODE_LABELS[context.mode]}: ${modeInstruction(context.mode)}`,
    `Current evidence label: ${label}.`,
    strongest.length > 0
      ? `Strongest available items include ${strongest.map((item) => item.publisher).join(", ")}.`
      : "No linked evidence items were supplied, so the answer is limited to user text or saved notes.",
    weak.length > 0 ? `Weak context includes ${weak.map((item) => item.publisher).join(", ")}.` : "",
    context.sourceMesh?.missingEvidence.length
      ? `Missing evidence: ${context.sourceMesh.missingEvidence.slice(0, 2).join(" ")}`
      : "",
  ].filter(Boolean);

  return {
    provider: "rule-based",
    mode: context.mode,
    answerSummary: summaryParts.join(" "),
    evidenceUsed: citations,
    confidenceLevel: confidenceFor(context, citations),
    limitations,
    suggestedNextChecks: nextChecks,
    unsupportedClaims: context.sourceMesh?.missingEvidence.length ? [] : ["Do not treat this as a final verdict without checking the linked sources."],
  };
}

function evidenceCitations(evidence: EvidenceItem[]): GroundedCitation[] {
  return evidence
    .filter((item) => /^https?:\/\//i.test(item.url))
    .slice(0, 8)
    .map((item) => ({
      title: item.title,
      publisher: item.publisher,
      url: item.url,
      note: item.evidenceType === "related" ? "Related context, not a verdict." : `Marked as ${item.evidenceType}.`,
    }));
}

function confidenceFor(context: EvidenceContext, citations: GroundedCitation[]): ProofbaseAIResponse["confidenceLevel"] {
  if (context.sourceMesh?.uncertaintyLevel === "low") return "high";
  if (context.sourceMesh?.uncertaintyLevel === "medium") return "medium";
  if (citations.length > 0) return "low";
  return "insufficient";
}

function limitationsFor(context: EvidenceContext): string[] {
  const out = [
    "The assistant is grounded to the supplied SourceMesh evidence and does not independently verify beyond it.",
    "It may summarize related coverage, but related coverage is not proof.",
  ];
  if (context.sourceMesh?.social) out.push("Social metadata is source context only; engagement is not credibility.");
  if (context.evidence.length === 0) out.push("No linked evidence items were supplied.");
  return out;
}

function nextChecksFor(context: EvidenceContext, question: string): string[] {
  const fromMesh = context.sourceMesh?.suggestedSearches.slice(0, 5) ?? [];
  const base = [
    `Primary source for: ${context.cleanedQuery || question}`,
    `Independent corroboration for: ${context.cleanedQuery || question}`,
    "Find the earliest source or original posting date.",
  ];
  return Array.from(new Set([...fromMesh, ...base])).slice(0, 6);
}
