/**
 * ProofMedia type architecture — PASS 16 foundation.
 *
 * All entities use string ids (slug or random) and ISO timestamps. The PASS 16
 * implementation persists everything to localStorage on a single device. A
 * future server pass can replace the store layer without touching these types.
 *
 * Hard rule: every persisted entity belongs to ONE user (the local user). We
 * never fabricate users, posts, evidence, or activity for anyone else.
 */

import type { ClaimCategory } from "@/lib/sources/types";
import type { SourceCategory } from "@/lib/categories";

// ────────────────────────────────────────────────────────────────────────────
// Identity / ownership
// ────────────────────────────────────────────────────────────────────────────

export interface OwnerStamp {
  authorUsername: string;     // "you" by default in local mode
  authorDisplayName: string;
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}

// ────────────────────────────────────────────────────────────────────────────
// Evidence attachments
// ────────────────────────────────────────────────────────────────────────────

export type AttachmentType =
  | "article"        // News article URL
  | "study"          // Academic/research paper
  | "government"     // .gov / official agency
  | "court"          // Court filing or opinion
  | "video"          // Video URL (YouTube, etc.) — we do NOT scrape video
  | "social"         // Social media post URL
  | "screenshot"     // User-supplied image link (we do not host images server-side)
  | "pdf"            // PDF URL
  | "other";

export type StanceLabel = "supports" | "disputes" | "context" | "unclear";

/**
 * Evidence attachment metadata. We never invent these fields — they are either
 * supplied by the user, extracted via /api/extract-url, or pulled from
 * /api/check evidence cards. If a field is unknown, leave it null.
 */
export interface EvidenceAttachment {
  id: string;
  url: string;                // REQUIRED, must be a real http(s) URL
  type: AttachmentType;
  title: string;
  publisher: string | null;
  publisherDomain: string | null;
  publishedAt: string | null;
  snippet: string;
  stance: StanceLabel;        // user-asserted stance toward the parent claim
  whyItMatters: string | null;
  // Auto-fields filled from the SourceMesh pipeline when available
  sourceCategory: SourceCategory | null;
  sourceQualityScore: number | null;
  warningFlags: string[];
  limitations: string[];
  addedAt: string;
  addedBy: string;            // username
}

// ────────────────────────────────────────────────────────────────────────────
// Claim threads
// ────────────────────────────────────────────────────────────────────────────

export type ClaimKind =
  | "claim"             // A factual assertion to be examined
  | "question"          // An open question (epistemic, not rhetorical)
  | "evidence-request"  // "Looking for sources on X"
  | "timeline"          // A timeline thread
  | "article-discussion"// Discussion anchored to a specific URL
  | "debate-prompt";    // Seeds a debate room

export interface ClaimThread {
  id: string;                 // slug
  kind: ClaimKind;
  title: string;
  body: string;               // markdown-light plain text; no HTML
  tags: string[];
  category: ClaimCategory;    // reused from existing source router
  sourceUrl: string | null;   // for article-discussion / timeline anchors
  evidence: EvidenceAttachment[];
  rebuttals: Rebuttal[];
  contextNotes: ContextNote[];
  sourceMeshSummary: SourceMeshSummary | null; // last automated summary, if any
  relatedClaimIds: string[];
  isStub: boolean;            // true when shown on a stub/onboarding page
  owner: OwnerStamp;
}

// ────────────────────────────────────────────────────────────────────────────
// Rebuttals & Context notes
// ────────────────────────────────────────────────────────────────────────────

/**
 * A rebuttal is a structured counter-argument. Like the parent claim, a
 * rebuttal MUST attach evidence. Free-form opinion-only rebuttals are not
 * accepted by the form.
 */
export interface Rebuttal {
  id: string;
  body: string;
  evidence: EvidenceAttachment[];   // MUST have >= 1 entry to publish
  owner: OwnerStamp;
  votes: { up: number; down: number; net: number };
}

/**
 * A context note is a Community-Notes-style annotation: it adds missing
 * context, corrections, or warnings to a claim. Notes MUST attach at least
 * one supporting source.
 */
export type ContextNoteKind =
  | "missing-context"
  | "timeline-clarification"
  | "source-warning"
  | "misleading-framing"
  | "correction"
  | "follow-up-evidence";

export interface ContextNote {
  id: string;
  kind: ContextNoteKind;
  body: string;
  evidence: EvidenceAttachment[];   // MUST have >= 1 entry to publish
  confidence: "low" | "medium" | "high";
  visibilityScore: number;          // 0-100, set locally; ranking signal only
  owner: OwnerStamp;
}

// ────────────────────────────────────────────────────────────────────────────
// SourceMesh auto-analysis snapshot
// ────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of what the SourceMesh pipeline (existing /api/check) said when a
 * claim was last analyzed. Persisted with the claim so we don't re-fetch on
 * every render. Only set when a real /api/check ran — never invented.
 */
export interface SourceMeshSummary {
  verdict: "supports" | "disputes" | "mixed" | "related-only" | "none";
  sourceQualityScore: number | null;
  confidenceLevel: "high" | "medium" | "low" | "insufficient";
  coverageLevel: "low" | "medium" | "high";
  category: ClaimCategory;
  adaptersOk: number;
  evidenceCount: number;
  checkedAt: string;
  warnings: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Collections
// ────────────────────────────────────────────────────────────────────────────

export interface CollectionItem {
  id: string;
  kind: "evidence" | "claim" | "note";
  evidence?: EvidenceAttachment;
  claimId?: string;
  noteBody?: string;
  addedAt: string;
}

export interface Collection {
  id: string;                 // slug
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;          // local-only flag; nothing is actually shared in PASS 16
  items: CollectionItem[];
  owner: OwnerStamp;
}

// ────────────────────────────────────────────────────────────────────────────
// Research profiles
// ────────────────────────────────────────────────────────────────────────────

export type ResearchBadgeKind =
  | "first-claim"
  | "first-collection"
  | "evidence-contributor"   // ≥5 claims with ≥1 evidence each
  | "context-noter"          // ≥3 context notes
  | "debater"                // ≥1 debate participation
  | "researcher"             // ≥1 collection with ≥5 items
  | "transparency";          // every claim has ≥2 evidence items

export interface ResearchBadge {
  kind: ResearchBadgeKind;
  earnedAt: string;
  label: string;
  detail: string;
}

export interface ResearchProfile {
  username: string;           // slug-safe
  displayName: string;
  bio: string;
  joinedAt: string;
  topicInterests: string[];   // tag strings
  badges: ResearchBadge[];
  metrics: {
    claimsPosted: number;
    evidenceAdded: number;
    rebuttalsPosted: number;
    contextNotesPosted: number;
    debatesEntered: number;
    collectionsPublic: number;
    /** Quality metrics — local-only signals; never used as ranking against other users. */
    avgEvidencePerClaim: number;
    avgSourceQualityScore: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Debate rooms
// ────────────────────────────────────────────────────────────────────────────

export type DebatePositionId = "pro" | "con" | "moderator" | "audience";

export interface DebatePosition {
  id: DebatePositionId;
  label: string;
  description: string;
  ownerUsername: string | null;   // who currently holds this position
}

export interface DebateEvidence {
  id: string;
  positionId: DebatePositionId;
  evidence: EvidenceAttachment;   // must have a real URL
  addedAt: string;
}

export interface DebateRound {
  id: string;
  index: number;             // round number
  prompt: string;
  startedAt: string;
  endedAt: string | null;    // null = round still open
  evidence: DebateEvidence[];
  notes: string;             // moderator notes
}

export interface DebateRoom {
  id: string;
  topic: string;
  prompt: string;
  positions: DebatePosition[]; // typically [pro, con] + optional moderator
  rounds: DebateRound[];
  status: "draft" | "open" | "in-progress" | "closed";
  rules: string[];
  /** Audience voting is a planned feature — never tallied or shown until enabled. */
  audienceVotingEnabled: false;
  owner: OwnerStamp;
}

// ────────────────────────────────────────────────────────────────────────────
// Moderation (architecture-only — no panel built yet)
// ────────────────────────────────────────────────────────────────────────────

export type ReportType =
  | "spam"
  | "harassment"
  | "fabricated-evidence"
  | "broken-link"
  | "paywall-bypass-attempt"
  | "off-topic"
  | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ReportFlag {
  id: string;
  type: ReportType;
  reason: string;
  reporterUsername: string;
  targetKind: "claim" | "rebuttal" | "context-note" | "evidence" | "debate" | "collection" | "profile";
  targetId: string;
  status: ReportStatus;
  createdAt: string;
  resolutionNote: string | null;
}

export interface EvidenceDispute {
  id: string;
  evidenceId: string;
  reason: "broken-link" | "misattributed" | "out-of-date" | "fabricated" | "other";
  disputerUsername: string;
  detail: string;
  status: ReportStatus;
  createdAt: string;
}

export interface MisinformationWarning {
  id: string;
  targetKind: "claim" | "evidence";
  targetId: string;
  warningText: string;
  evidenceUrls: string[];     // sources backing the warning
  postedBy: string;           // username
  createdAt: string;
  visible: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Monetization (architecture-only — no payments, no gating yet)
// ────────────────────────────────────────────────────────────────────────────

export type PlanTier = "free" | "research" | "team" | "creator";

export interface FutureFeatureFlag {
  /** Which tier is required to enable the feature ONCE billing is implemented. */
  requires: PlanTier;
  /** Whether the flag is currently on for development. */
  enabled: boolean;
}

export interface FutureFeatureSet {
  premiumAiAssistant: FutureFeatureFlag;
  teamWorkspaces: FutureFeatureFlag;
  debateClubPlans: FutureFeatureFlag;
  creatorTools: FutureFeatureFlag;
  pdfExportReports: FutureFeatureFlag;
}

export const DEFAULT_FUTURE_FEATURES: FutureFeatureSet = {
  premiumAiAssistant: { requires: "research", enabled: false },
  teamWorkspaces:     { requires: "team",     enabled: false },
  debateClubPlans:    { requires: "research", enabled: false },
  creatorTools:       { requires: "creator",  enabled: false },
  pdfExportReports:   { requires: "research", enabled: false },
};

// ────────────────────────────────────────────────────────────────────────────
// Topic follows (purely local; no fan-out to others)
// ────────────────────────────────────────────────────────────────────────────

export interface TopicFollow {
  tag: string;
  followedAt: string;
}
