import type { ProofbaseAssistantMode } from "./types";

export const MODE_LABELS: Record<ProofbaseAssistantMode, string> = {
  "research-assistant": "Research Assistant",
  "debate-coach": "Debate Coach",
  "source-analyst": "Source Analyst",
  "social-claim-analyst": "Social Claim Analyst",
  "definition-context": "Definition/Context Explainer",
  "argument-builder": "Argument Builder",
  "routine-agent-planner": "Routine Agent Planner",
};

export const PROOFBASE_ASSISTANT_RULES = [
  "Use only supplied evidence, saved notes, user text, public metadata, or SourceMesh search metadata.",
  "Never invent sources, URLs, citations, quotes, statistics, verdicts, or platform metadata.",
  "When evidence is missing, say that there is not enough evidence yet.",
  "Explain uncertainty with plain language.",
  "Suggest better searches or primary sources instead of filling gaps with guesses.",
];

export function modeInstruction(mode: ProofbaseAssistantMode): string {
  switch (mode) {
    case "debate-coach":
      return "Organize pro, con, rebuttal, and cross-examination prompts from the evidence.";
    case "source-analyst":
      return "Assess source quality, source type, and missing primary-source signals.";
    case "social-claim-analyst":
      return "Separate social-source quality from independent claim evidence.";
    case "definition-context":
      return "Explain the term or context only from supplied source context and user text.";
    case "argument-builder":
      return "Build a source-backed argument with limitations and possible counterpoints.";
    case "routine-agent-planner":
      return "Convert the task into a repeatable research routine with search targets.";
    default:
      return "Summarize what the evidence supports, what it does not support, and what to search next.";
  }
}
