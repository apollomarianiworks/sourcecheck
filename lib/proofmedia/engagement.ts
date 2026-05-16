"use client";

import type { ClaimDoc } from "@/lib/community/firestore";
import { ClaimStore, CollectionStore, DebateStore, FollowStore } from "./store";
import type {
  EvidenceNeedKind,
  FeedLaneId,
  ProofmediaAction,
  SocialActionKind,
  StarterPrompt,
} from "./types";
export { STARTER_PROMPTS, STARTER_TOPICS } from "./starter";
import { STARTER_PROMPTS } from "./starter";

const ACTION_KEY = "proofmedia.actions.v1";
const ONBOARDING_KEY = "proofmedia.onboarding.v1";

export const FEED_LANES: { id: FeedLaneId; label: string; description: string }[] = [
  { id: "for-you", label: "For You", description: "Quality-weighted posts, followed topics, and unresolved claims." },
  { id: "following", label: "Following", description: "Claims matching topics you follow locally." },
  { id: "topics", label: "Topics", description: "Source-rich posts grouped around topic tags." },
  { id: "debates", label: "Debates", description: "Debate prompts and claims with active rebuttal potential." },
  { id: "evidence-needed", label: "Evidence Needed", description: "Claims that need sources, primary documents, or opposing evidence." },
  { id: "recently-contexted", label: "Context Added", description: "Posts with SourceMesh context or recent discussion." },
  { id: "trending-questions", label: "Questions", description: "Question-shaped posts. Not a fake trending chart." },
];

function safeLS(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function readActions(): ProofmediaAction[] {
  const ls = safeLS();
  if (!ls) return [];
  try {
    const raw = ls.getItem(ACTION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as ProofmediaAction[] : [];
  } catch {
    return [];
  }
}

function writeActions(actions: ProofmediaAction[]) {
  const ls = safeLS();
  if (!ls) return;
  try { ls.setItem(ACTION_KEY, JSON.stringify(actions.slice(0, 500))); } catch { /* ignore quota */ }
}

export const ActionStore = {
  list: readActions,
  record(kind: SocialActionKind, targetType: ProofmediaAction["targetType"], targetId: string, metadata?: ProofmediaAction["metadata"]) {
    const action: ProofmediaAction = {
      id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      targetType,
      targetId,
      metadata,
      createdAt: new Date().toISOString(),
    };
    writeActions([action, ...readActions()]);
    return action;
  },
  has(kind: SocialActionKind, targetType: ProofmediaAction["targetType"], targetId: string) {
    return readActions().some((a) => a.kind === kind && a.targetType === targetType && a.targetId === targetId);
  },
};

export function markOnboardingSeen() {
  const ls = safeLS();
  try { ls?.setItem(ONBOARDING_KEY, "true"); } catch { /* ignore */ }
}

export function hasSeenOnboarding() {
  const ls = safeLS();
  try { return ls?.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
}

export function getFollowedTopics(): string[] {
  return FollowStore.list().map((f) => f.tag.toLowerCase());
}

export function rankClaimsForLane(items: ClaimDoc[], lane: FeedLaneId, followedTopics = getFollowedTopics()): ClaimDoc[] {
  const followed = new Set(followedTopics.map((t) => t.toLowerCase()));
  const inFollowed = (c: ClaimDoc) => c.tags.some((t) => followed.has(t.toLowerCase())) || followed.has(c.category);

  const filtered = items.filter((c) => {
    if (lane === "following") return inFollowed(c);
    if (lane === "topics") return c.tags.length > 0;
    if (lane === "debates") return c.title.includes("?") || c.tags.some((t) => /debate|policy|argument|pro-con/.test(t));
    if (lane === "evidence-needed") return evidenceNeedsForClaim(c).length > 0;
    if (lane === "recently-contexted") return Boolean(c.sourceMeshSummary) || c.commentCount > 0;
    if (lane === "trending-questions") return c.title.includes("?") || c.body.includes("?");
    return true;
  });

  return filtered.sort((a, b) => scoreClaimForLane(b, lane, followed) - scoreClaimForLane(a, lane, followed));
}

function scoreClaimForLane(c: ClaimDoc, lane: FeedLaneId, followed: Set<string>): number {
  let score = 0;
  score += Math.min(c.evidenceCount, 5) * 8;
  score += Math.min(c.commentCount, 8) * 3;
  if (c.sourceMeshSummary) score += 18;
  if (c.sourceMeshSummary?.confidenceLevel === "high") score += 6;
  if (c.sourceMeshSummary?.confidenceLevel === "insufficient") score -= 4;
  if (c.tags.some((t) => followed.has(t.toLowerCase())) || followed.has(c.category)) score += 22;
  if (evidenceNeedsForClaim(c).length > 0) score += lane === "evidence-needed" ? 30 : 5;
  if (lane === "recently-contexted") score += c.commentCount * 4 + (c.sourceMeshSummary ? 10 : 0);
  if (lane === "trending-questions" && (c.title.includes("?") || c.body.includes("?"))) score += 20;
  score += Date.parse(c.updatedAt || c.createdAt) / 100000000000;
  return score;
}

export function evidenceNeedsForClaim(c: ClaimDoc): EvidenceNeedKind[] {
  const needs: EvidenceNeedKind[] = [];
  const lower = `${c.title} ${c.body} ${c.tags.join(" ")}`.toLowerCase();
  if (c.evidenceCount === 0) needs.push("needs-source");
  if (!c.evidenceUrls.some((u) => /(\.gov|courtlistener|supreme\.justia|sec\.gov|fda\.gov|cdc\.gov|nih\.gov|pubmed|arxiv|doi\.org)/i.test(u))) {
    needs.push("needs-primary-source");
  }
  if (c.sourceMeshSummary?.verdict === "supports" || c.sourceMeshSummary?.verdict === "disputes") needs.push("needs-opposing-evidence");
  if (/timeline|when|before|after|history|sequence/.test(lower)) needs.push("needs-timeline-context");
  if (/health|medical|doctor|study|science|research|climate|ai/.test(lower)) needs.push("needs-expert-source");
  if (/court|legal|illegal|law|lawsuit|crime|charged|sec|ftc/.test(lower)) needs.push("needs-legal-clarification");
  return Array.from(new Set(needs)).slice(0, 3);
}

export function getStarterPromptsForLane(lane: FeedLaneId, followedTopics = getFollowedTopics()): StarterPrompt[] {
  const followed = new Set(followedTopics);
  const prompts = STARTER_PROMPTS.filter((p) => p.lane === lane || lane === "for-you");
  const sorted = prompts.sort((a, b) => Number(followed.has(b.topic)) - Number(followed.has(a.topic)));
  return sorted.slice(0, 4);
}

export function buildProgressSnapshot() {
  const claims = ClaimStore.list();
  const collections = CollectionStore.list();
  const debates = DebateStore.list();
  const actions = ActionStore.list();
  const evidenceAdded = claims.reduce((sum, c) => sum + c.evidence.length, 0) + actions.filter((a) => a.kind === "add-evidence").length;
  const contextNotes = claims.reduce((sum, c) => sum + c.contextNotes.length, 0) + actions.filter((a) => a.kind === "add-context").length;
  const rebuttals = claims.reduce((sum, c) => sum + c.rebuttals.length, 0) + actions.filter((a) => a.kind === "rebut").length;
  const saved = actions.filter((a) => a.kind === "save").length;
  const helpful = actions.filter((a) => a.kind === "helpful").length;
  const followed = FollowStore.list().length;

  const badges = [
    evidenceAdded >= 1 && { label: "Source Finder", detail: "Added or saved real evidence." },
    contextNotes >= 1 && { label: "Context Builder", detail: "Added context to a claim." },
    debates.length + rebuttals >= 1 && { label: "Debate Prepper", detail: "Started or joined evidence-backed debate work." },
    claims.some((c) => c.evidence.some((e) => /(\.gov|courtlistener|sec\.gov|fda\.gov|cdc\.gov|nih\.gov|pubmed|arxiv|doi\.org)/i.test(e.url))) && { label: "Primary Source Hunter", detail: "Attached a primary or near-primary source." },
    collections.length >= 1 && { label: "Research Organizer", detail: "Created a research collection." },
    helpful + saved + followed >= 3 && { label: "Community Helper", detail: "Used helpful, save, or follow actions." },
  ].filter(Boolean) as { label: string; detail: string }[];

  return {
    claimsPosted: claims.length,
    evidenceAdded,
    contextNotes,
    helpfulSignals: helpful,
    savedItems: saved,
    collections: collections.length,
    debateBriefs: debates.length,
    followedTopics: followed,
    badges,
  };
}

export function collectionHealthSnapshot() {
  const collections = CollectionStore.list();
  const totalItems = collections.reduce((sum, c) => sum + c.items.length, 0);
  const domains = new Set<string>();
  for (const collection of collections) {
    for (const item of collection.items) {
      const url = item.evidence?.url;
      if (!url) continue;
      try { domains.add(new URL(url).hostname.replace(/^www\./, "")); } catch { /* ignore */ }
    }
  }

  return {
    collections: collections.length,
    totalItems,
    sourceDiversity: domains.size,
    missingViewpointWarning: totalItems > 0 && domains.size < 3,
  };
}
