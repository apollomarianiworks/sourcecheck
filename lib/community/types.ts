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
