"use client";

import type { EvidenceItem } from "@/lib/types";

export interface ResearchCollection {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  topicTags: string[];
  evidence: EvidenceItem[];
  notes: string[];
}

const KEY = "proofbase.collections.v1";

export function listCollections(): ResearchCollection[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const parsed = JSON.parse(ls.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as ResearchCollection[] : [];
  } catch {
    return [];
  }
}

export function saveCollection(collection: ResearchCollection): ResearchCollection[] {
  const ls = storage();
  if (!ls) return [];
  const now = new Date().toISOString();
  const current = listCollections();
  const next = [
    { ...collection, updatedAt: now },
    ...current.filter((item) => item.id !== collection.id),
  ].slice(0, 100);
  try {
    ls.setItem(KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function createEmptyCollection(title: string): ResearchCollection {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description: "",
    createdAt: now,
    updatedAt: now,
    topicTags: [],
    evidence: [],
    notes: [],
  };
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
