import type { EvidenceType, SourceMeshConfidenceLabel } from "@/lib/types";

export type TrainingFeedbackKind = "useful" | "missing-source" | "bad-summary" | "wrong-category" | "improve-answer";

export interface ProofbaseTrainingEvent {
  id: string;
  query: string;
  cleanedQuery: string;
  generatedSearchVariants: string[];
  selectedSources: string[];
  evidenceLabels: EvidenceType[];
  confidenceLabel: SourceMeshConfidenceLabel | "not-run";
  userFeedback: TrainingFeedbackKind;
  finalSummary: string;
  correctionNotes: string;
  timestamp: string;
  privacy: {
    containsPrivateUserData: false;
    includesApiKeys: false;
    includesPrivateSocialContent: false;
  };
}
