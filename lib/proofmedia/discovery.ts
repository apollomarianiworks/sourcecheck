"use client";

import type { ClaimDoc } from "@/lib/community/firestore";
import { ActionStore } from "./engagement";
import { evidenceNeedsForClaim } from "./engagement";
import { CollectionStore, FollowStore } from "./store";

export interface DiscoveryTopic {
  label: string;
  count: number;
  evidenceCount: number;
  latestAt: string;
}

export interface DiscoverySnapshot {
  hasActivity: boolean;
  activityLabel: "Trending" | "Emerging";
  topics: DiscoveryTopic[];
  risingDebates: ClaimDoc[];
  emergingClaims: ClaimDoc[];
  mostSavedCollections: { id: string; name: string; saves: number; itemCount: number }[];
  mostCitedSources: { domain: string; count: number }[];
  mostFollowedTopics: { tag: string; count: 1 }[];
  fastGrowingDiscussions: ClaimDoc[];
  sourceDisputes: ClaimDoc[];
  liveSignals: string[];
}

export function buildDiscoverySnapshot(items: ClaimDoc[]): DiscoverySnapshot {
  const actions = ActionStore.list();
  const hasActivity = items.some((item) => item.commentCount + item.evidenceCount + item.score > 0) || actions.length > 0;
  const topicMap = new Map<string, DiscoveryTopic>();
  const sourceMap = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags.length > 0 ? item.tags : [item.category]) {
      const key = tag.toLowerCase();
      const prev = topicMap.get(key);
      topicMap.set(key, {
        label: key,
        count: (prev?.count ?? 0) + 1,
        evidenceCount: (prev?.evidenceCount ?? 0) + item.evidenceCount,
        latestAt: later(prev?.latestAt, item.updatedAt || item.createdAt),
      });
    }
    for (const url of item.evidenceUrls) {
      const domain = domainFromUrl(url);
      if (domain) sourceMap.set(domain, (sourceMap.get(domain) ?? 0) + 1);
    }
  }

  const actionSaves = actions.filter((action) => action.kind === "save" && action.targetType === "collection");
  const savedCounts = new Map<string, number>();
  for (const action of actionSaves) savedCounts.set(action.targetId, (savedCounts.get(action.targetId) ?? 0) + 1);

  const liveSignals = [
    actions.some((action) => action.kind === "save") && "Saved research changed",
    actions.some((action) => action.kind === "add-evidence") && "New evidence added",
    actions.some((action) => action.kind === "rebut") && "Rebuttal activity recorded",
    actions.some((action) => action.kind === "follow-topic") && "Followed topic updated",
  ].filter(Boolean) as string[];

  return {
    hasActivity,
    activityLabel: hasActivity ? "Trending" : "Emerging",
    topics: Array.from(topicMap.values()).sort((a, b) => (b.count + b.evidenceCount) - (a.count + a.evidenceCount)).slice(0, 8),
    risingDebates: items.filter(isDebateLike).sort(activitySort).slice(0, 5),
    emergingClaims: items.filter((item) => evidenceNeedsForClaim(item).length > 0 || item.evidenceCount > 0).sort(activitySort).slice(0, 6),
    mostSavedCollections: CollectionStore.list().map((collection) => ({
      id: collection.id,
      name: collection.name,
      saves: savedCounts.get(collection.id) ?? 0,
      itemCount: collection.items.length,
    })).sort((a, b) => (b.saves + b.itemCount) - (a.saves + a.itemCount)).slice(0, 5),
    mostCitedSources: Array.from(sourceMap.entries()).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    mostFollowedTopics: FollowStore.list().map((follow) => ({ tag: follow.tag, count: 1 as const })).slice(0, 8),
    fastGrowingDiscussions: items.filter((item) => item.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount).slice(0, 5),
    sourceDisputes: items.filter((item) => evidenceNeedsForClaim(item).includes("needs-opposing-evidence") || item.sourceMeshSummary?.verdict === "mixed").sort(activitySort).slice(0, 5),
    liveSignals,
  };
}

function activitySort(a: ClaimDoc, b: ClaimDoc): number {
  const left = b.evidenceCount * 5 + b.commentCount * 3 + b.score + Date.parse(b.updatedAt || b.createdAt) / 100000000000;
  const right = a.evidenceCount * 5 + a.commentCount * 3 + a.score + Date.parse(a.updatedAt || a.createdAt) / 100000000000;
  return left - right;
}

function isDebateLike(item: ClaimDoc): boolean {
  return item.title.includes("?") || /debate|policy|argument|rebuttal|should|versus|vs\.?/i.test(`${item.title} ${item.body} ${item.tags.join(" ")}`);
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function later(a: string | undefined, b: string): string {
  if (!a) return b;
  return Date.parse(a) > Date.parse(b) ? a : b;
}
