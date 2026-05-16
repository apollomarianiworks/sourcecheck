import type { CheckResult, EvidenceItem, SourceMeshReport } from "@/lib/types";

export type ProofbaseAssistantMode =
  | "research-assistant"
  | "debate-coach"
  | "source-analyst"
  | "social-claim-analyst"
  | "definition-context"
  | "argument-builder"
  | "routine-agent-planner";

export type ProofbaseAIProviderId =
  | "rule-based"
  | "openai"
  | "anthropic"
  | "google-gemini"
  | "huggingface-local";

export interface EvidenceContext {
  query: string;
  cleanedQuery: string;
  mode: ProofbaseAssistantMode;
  sourceMesh: SourceMeshReport | null;
  evidence: EvidenceItem[];
  savedCollectionNotes: string[];
  userProvidedText: string[];
  publicMetadata: string[];
}

export interface GroundedCitation {
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export interface ProofbaseAIRequest {
  mode: ProofbaseAssistantMode;
  question: string;
  checkResult?: CheckResult | null;
  sourceMesh?: SourceMeshReport | null;
  userText?: string[];
  collectionNotes?: string[];
}

export interface ProofbaseAIResponse {
  provider: ProofbaseAIProviderId;
  mode: ProofbaseAssistantMode;
  answerSummary: string;
  evidenceUsed: GroundedCitation[];
  confidenceLevel: "high" | "medium" | "low" | "insufficient";
  limitations: string[];
  suggestedNextChecks: string[];
  unsupportedClaims: string[];
}

export interface ProofbaseAIProvider {
  id: ProofbaseAIProviderId;
  available: () => boolean;
  assist: (context: EvidenceContext, question: string) => Promise<ProofbaseAIResponse>;
}
