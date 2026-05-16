"use client";

import type { ClaimDoc, SaveDoc } from "@/lib/community/firestore";
import { ActionStore } from "./engagement";

export interface ReputationBadge {
  label: string;
  detail: string;
  earned: boolean;
}

export interface ReputationSnapshot {
  score: number;
  level: string;
  helpfulRating: number;
  metrics: {
    evidenceContributions: number;
    contextNotesAdded: number;
    debatesParticipated: number;
    sourceQualityAverage: number;
    collectionsCreated: number;
    sourcesCited: number;
    savedItems: number;
    profileViewsPlaceholder: number;
  };
  topTopics: string[];
  badges: ReputationBadge[];
}

export function buildReputationSnapshot(args: {
  claims: ClaimDoc[];
  saves?: SaveDoc[];
  collectionsCreated?: number;
}): ReputationSnapshot {
  const actions = ActionStore.list();
  const evidenceContributions = args.claims.reduce((sum, claim) => sum + claim.evidenceCount, 0) + actions.filter((a) => a.kind === "add-evidence").length;
  const contextNotesAdded = actions.filter((a) => a.kind === "add-context").length;
  const debatesParticipated = actions.filter((a) => a.kind === "rebut").length + args.claims.filter((claim) => /debate|should|vs\.?|versus/i.test(claim.title)).length;
  const sourcesCited = new Set(args.claims.flatMap((claim) => claim.evidenceUrls.map(domainFromUrl).filter(Boolean))).size;
  const qualityScores = args.claims.map((claim) => claim.sourceMeshSummary?.sourceQualityScore).filter((score): score is number => typeof score === "number");
  const sourceQualityAverage = qualityScores.length ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : 0;
  const savedItems = args.saves?.length ?? actions.filter((a) => a.kind === "save").length;
  const collectionsCreated = args.collectionsCreated ?? actions.filter((a) => a.kind === "save" && a.targetType === "collection").length;
  const score = evidenceContributions * 12 + contextNotesAdded * 16 + debatesParticipated * 14 + sourcesCited * 5 + collectionsCreated * 18 + Math.round(sourceQualityAverage / 2);
  const helpfulSignals = actions.filter((a) => a.kind === "helpful").length;
  const topicCounts = new Map<string, number>();
  for (const claim of args.claims) {
    for (const tag of claim.tags.length ? claim.tags : [claim.category]) {
      topicCounts.set(tag, (topicCounts.get(tag) ?? 0) + 1);
    }
  }

  const badges: ReputationBadge[] = [
    { label: "Source Hunter", detail: "Cited at least three distinct sources.", earned: sourcesCited >= 3 },
    { label: "Evidence Contributor", detail: "Added five or more evidence links.", earned: evidenceContributions >= 5 },
    { label: "Context Builder", detail: "Added source-backed context notes.", earned: contextNotesAdded >= 1 },
    { label: "Debate Strategist", detail: "Participated in debate or rebuttal work.", earned: debatesParticipated >= 1 },
    { label: "Collection Curator", detail: "Created or saved collection-quality research.", earned: collectionsCreated >= 1 || savedItems >= 3 },
    { label: "Transparent Researcher", detail: "Maintains strong average source quality.", earned: sourceQualityAverage >= 70 },
  ];

  return {
    score,
    level: score >= 300 ? "Senior Researcher" : score >= 160 ? "Research Builder" : score >= 60 ? "Evidence Scout" : "New Researcher",
    helpfulRating: Math.min(100, helpfulSignals * 10 + Math.min(50, evidenceContributions * 4)),
    metrics: {
      evidenceContributions,
      contextNotesAdded,
      debatesParticipated,
      sourceQualityAverage,
      collectionsCreated,
      sourcesCited,
      savedItems,
      profileViewsPlaceholder: 0,
    },
    topTopics: Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).map(([topic]) => topic).slice(0, 6),
    badges,
  };
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
