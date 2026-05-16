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

export type UserRestriction =
  | "banned"
  | "no-post"
  | "no-comment"
  | "no-like"
  | "no-save"
  | "no-follow"
  | "no-report"
  | "no-profile-edit"
  | "no-routine-run"
  | "needs-review";

export type ModerationAction =
  | "mark-under-review"
  | "remove-content"
  | "restore-content"
  | "restrict-user"
  | "clear-restriction"
  | "resolve-report"
  | "dismiss-report";

export interface AuditLogEvent {
  id: string;
  action: ModerationAction | "protected-field-edit" | "rate-limited" | "unsafe-url" | "spam-detected";
  actorId: string | null;
  targetKind: "claim" | "comment" | "profile" | "collection" | "routine" | "report" | "api";
  targetId: string | null;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

export interface AbuseSignal {
  kind:
    | "repeated-content"
    | "link-spam"
    | "duplicate-evidence"
    | "suspicious-username"
    | "impersonation-username"
    | "unsupported-claim"
    | "low-quality-source-flood"
    | "excessive-reports"
    | "mass-following"
    | "mass-liking"
    | "unsafe-url";
  severity: "low" | "medium" | "high";
  message: string;
  reviewRecommended?: boolean;
}

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

// PASS 20 engagement architecture. These types are intentionally local-first:
// they describe real actions or future server events, never fabricated activity.
export type FeedLaneId =
  | "for-you"
  | "following"
  | "topics"
  | "debates"
  | "trending-debates"
  | "evidence-needed"
  | "recently-contexted"
  | "new-collections"
  | "viral-claims"
  | "breaking-topics"
  | "latest-rebuttals"
  | "source-disputes"
  | "open-questions"
  | "trending-questions";

export type EvidenceNeedKind =
  | "needs-source"
  | "needs-primary-source"
  | "needs-opposing-evidence"
  | "needs-timeline-context"
  | "needs-expert-source"
  | "needs-legal-clarification";

export type SocialActionKind =
  | "like"
  | "helpful"
  | "save"
  | "follow-user"
  | "follow-topic"
  | "comment"
  | "rebut"
  | "add-context"
  | "add-evidence"
  | "report"
  | "share";

export interface ProofmediaAction {
  id: string;
  kind: SocialActionKind;
  targetType: "claim" | "comment" | "topic" | "user" | "collection" | "debate";
  targetId: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export type NotificationKind =
  | "new-follower"
  | "post-liked"
  | "post-saved"
  | "comment-reply"
  | "rebuttal-added"
  | "context-note-added"
  | "evidence-added"
  | "collection-followed"
  | "debate-update"
  | "followed-topic-update"
  | "routine-result-ready"
  | "collaborator-invite";

export interface ProofmediaNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  targetUrl: string | null;
  createdAt: string;
  readAt: string | null;
  isRealEvent: true;
}

export interface StarterPrompt {
  id: string;
  lane: FeedLaneId;
  title: string;
  body: string;
  topic: string;
  actionLabel: string;
  href: string;
}

export type AnalyticsEventName =
  | "search_submitted"
  | "post_created"
  | "evidence_added"
  | "context_added"
  | "debate_joined"
  | "collection_created"
  | "topic_followed"
  | "user_followed"
  | "routine_created"
  | "save_clicked"
  | "share_clicked";

// PASS 23 ecosystem architecture. These records are scaffolds for real
// collaborative systems; starter rows must be labeled as prompts or templates.
export type CreatorMode = "researcher" | "debater" | "investigator" | "educator" | "source-analyst";

export interface CreatorStats {
  collectionSaves: number;
  evidenceCitations: number;
  contextNotesAccepted: number;
  helpfulContributions: number;
  debateParticipation: number;
  researchFollowers: number;
}

export interface CreatorShowcase {
  mode: CreatorMode;
  statusLine: string;
  expertise: string[];
  pinnedStatements: string[];
  featuredCollectionIds: string[];
  featuredDebateIds: string[];
  featuredInvestigationIds: string[];
  featuredEvidenceUrls: string[];
  stats: CreatorStats;
}

export type SpaceCategory =
  | "ai-tech"
  | "politics"
  | "justice"
  | "health"
  | "climate"
  | "media"
  | "finance"
  | "world";

export interface IntelligenceSpace {
  id: string;
  name: string;
  category: SpaceCategory;
  description: string;
  starterPrompt: string;
  pinnedResources: string[];
  suggestedRoutines: string[];
  moderationModel: "local-starter" | "community-moderated" | "staff-assisted";
  defaultTags: string[];
}

export interface CollectionCollaborator {
  username: string;
  role: "owner" | "editor" | "contributor" | "viewer";
  addedAt: string;
}

export interface CollectionSection {
  id: string;
  kind: "evidence" | "argument" | "timeline" | "context" | "missing-evidence";
  title: string;
  description: string;
  itemIds: string[];
}

export interface CollaborativeCollectionMeta {
  collectionId: string;
  contributors: CollectionCollaborator[];
  sections: CollectionSection[];
  pinnedEvidenceIds: string[];
  activityCount: number;
  revisionCount: number;
  sourceCoverageScore: number;
  completionStatus: "seed" | "collecting" | "reviewing" | "publish-ready";
}

export interface InvestigationTimelineEvent {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  evidenceUrls: string[];
}

export interface InvestigationBoard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  clusters: { id: string; label: string; evidenceUrls: string[] }[];
  timeline: InvestigationTimelineEvent[];
  unresolvedQuestions: string[];
  conflictingEvidence: string[];
  sourceMapDomains: string[];
  owner: OwnerStamp;
}

export interface LiveDebateArchitecture {
  debateId: string;
  stageStatus: "planned" | "ready" | "manual-live" | "archived";
  roundLengthMinutes: number;
  evidenceQueueIds: string[];
  audienceResponseEnabled: false;
  websocketEnabled: false;
}

export interface SourceProfile {
  domain: string;
  displayName: string;
  category: SourceCategory | null;
  transparencyIndicators: string[];
  citationBehavior: string[];
  usageStats: {
    citations: number;
    collections: number;
    debates: number;
    investigations: number;
  };
  relationshipDomains: string[];
}

export interface DiscoverySuggestion {
  id: string;
  reason: "because-researched" | "opposing-viewpoint" | "source-alternative" | "under-discussed" | "may-disagree";
  title: string;
  body: string;
  href: string;
}

export interface WorkspaceGroup {
  id: string;
  name: string;
  purpose: "classroom" | "debate-club" | "journalism-team" | "creator-group" | "research-team";
  memberRoles: Array<"owner" | "admin" | "editor" | "researcher" | "viewer">;
  createdAt: string;
}

export interface TeamCollection {
  id: string;
  groupId: string;
  collectionId: string;
  permissions: "view" | "comment" | "edit";
}

export interface TeamRoutine {
  id: string;
  groupId: string;
  routineId: string;
  visibility: "private" | "group" | "public-template";
}

export interface DigestTemplate {
  id: string;
  name: string;
  cadence: "daily" | "weekly" | "manual";
  includes: Array<"new-evidence" | "debates" | "context-notes" | "routine-results" | "research-trends">;
  delivery: "in-app-ready" | "email-future" | "export-only";
}
