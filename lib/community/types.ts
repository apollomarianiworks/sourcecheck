import type { EvidenceItem } from "@/lib/types";

export interface PublicClaimThread {
  id: string;
  title: string;
  claimText: string;
  createdAt: string;
  createdByUserId: string | null;
  status: "open" | "needs-primary-source" | "well-sourced" | "contested" | "archived";
  tags: string[];
  evidenceItems: EvidenceItem[];
  contextNotes: ContextNote[];
  rebuttals: EvidenceRebuttal[];
}

export interface ContextNote {
  id: string;
  body: string;
  sourceUrl: string | null;
  createdAt: string;
  createdByUserId: string | null;
}

export interface EvidenceRebuttal {
  id: string;
  targetEvidenceUrl: string;
  body: string;
  sourceUrl: string | null;
  createdAt: string;
  createdByUserId: string | null;
}

export interface DebateRoom {
  id: string;
  topic: string;
  createdAt: string;
  proEvidenceUrls: string[];
  conEvidenceUrls: string[];
  groundRules: string[];
}

export interface EvidenceAttachment {
  id: string;
  url: string;
  label: string;
  stance: "supports" | "disputes" | "context" | "primary-needed";
  addedAt: string;
}

export interface Rebuttal {
  id: string;
  body: string;
  sourceUrl: string | null;
  createdAt: string;
}

export interface EvidenceVote {
  id: string;
  evidenceId: string;
  vote: "useful" | "weak-source" | "needs-primary" | "off-topic";
  createdAt: string;
}

export interface CollectionShare {
  id: string;
  collectionId: string;
  title: string;
  visibility: "local-draft" | "private" | "public";
  sourceUrls: string[];
}

export interface ClaimPost {
  id: string;
  claimText: string;
  createdAt: string;
  visibility: "local-draft" | "private" | "public";
  evidence: EvidenceAttachment[];
  rebuttals: Rebuttal[];
  contextNotes: ContextNote[];
  votes: EvidenceVote[];
}
