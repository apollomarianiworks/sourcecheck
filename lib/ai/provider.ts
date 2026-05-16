import type { ProofbaseAIProvider, ProofbaseAIProviderId } from "./types";
import { buildCitationSafeResponse } from "./rag";

export const ruleBasedProvider: ProofbaseAIProvider = {
  id: "rule-based",
  available: () => true,
  assist: async (context, question) => buildCitationSafeResponse(context, question),
};

export function configuredProviderStatus(): { id: ProofbaseAIProviderId; available: boolean; notes: string }[] {
  return [
    { id: "rule-based", available: true, notes: "Always available. Uses deterministic grounded summaries and suggestions." },
    { id: "openai", available: !!process.env.OPENAI_API_KEY, notes: "Future optional provider for evidence summaries only." },
    { id: "anthropic", available: !!process.env.ANTHROPIC_API_KEY, notes: "Future optional provider for evidence summaries only." },
    { id: "google-gemini", available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY, notes: "Future optional provider for evidence summaries only." },
    { id: "huggingface-local", available: !!process.env.HUGGINGFACE_API_KEY || !!process.env.LOCAL_MODEL_URL, notes: "Future small-model or hosted inference adapter." },
  ];
}

export function getProofbaseAIProvider(): ProofbaseAIProvider {
  return ruleBasedProvider;
}
