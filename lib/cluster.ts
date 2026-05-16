import type { EvidenceItem } from "./types";

export type ClusterKind = "publisher" | "stance" | "story";

export interface EvidenceCluster {
  id: string;
  kind: ClusterKind;
  label: string;
  count: number;
  topItemIndex: number;       // index into evidence[] for the representative
  itemIndexes: number[];      // all members
}

/** Stop-words used when computing story similarity. */
const TITLE_STOP = new Set([
  "the","a","an","and","or","of","in","on","at","by","for","with","to","is","are",
  "was","were","be","as","that","this","it","its","from","but","not","into","over",
]);

function titleTokens(t: string): Set<string> {
  const tokens = t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !TITLE_STOP.has(w));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Dedupe and cluster evidence. Returns:
 *  - the deduplicated evidence list (same shape)
 *  - clusters grouped by publisher, by stance (for Fact Check items), and by story (title similarity)
 *
 * Indexes in clusters refer to the DEDUPED evidence array.
 */
export interface ClusterResult {
  dedupedEvidence: EvidenceItem[];
  clusters: EvidenceCluster[];
}

const STORY_SIMILARITY_THRESHOLD = 0.45;

export function clusterEvidence(items: EvidenceItem[]): ClusterResult {
  // 1) URL dedup — keep the first occurrence of each URL
  const seenUrls = new Set<string>();
  const deduped: EvidenceItem[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    deduped.push(item);
  }

  const clusters: EvidenceCluster[] = [];

  // 2) Publisher clusters — anything with >= 2 items from the same domain
  const byDomain = new Map<string, number[]>();
  deduped.forEach((it, idx) => {
    const d = it.domain.toLowerCase();
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push(idx);
  });
  for (const [domain, idxs] of byDomain.entries()) {
    if (idxs.length >= 2) {
      clusters.push({
        id: `pub:${domain}`,
        kind: "publisher",
        label: `${idxs.length} items from ${domain}`,
        count: idxs.length,
        topItemIndex: idxs[0],
        itemIndexes: idxs,
      });
    }
  }

  // 3) Stance clusters — only for Fact Check items, only when ≥2 in same stance
  const byStance = new Map<string, number[]>();
  deduped.forEach((it, idx) => {
    if (it.source !== "Fact Check") return;
    const key = it.evidenceType;
    if (!byStance.has(key)) byStance.set(key, []);
    byStance.get(key)!.push(idx);
  });
  for (const [stance, idxs] of byStance.entries()) {
    if (idxs.length >= 2) {
      clusters.push({
        id: `stance:${stance}`,
        kind: "stance",
        label: `${idxs.length} fact-checks rating "${stance}"`,
        count: idxs.length,
        topItemIndex: idxs[0],
        itemIndexes: idxs,
      });
    }
  }

  // 4) Story clusters — title-token jaccard >= threshold. Greedy single-pass.
  const tokensCache = deduped.map((d) => titleTokens(d.title));
  const assigned = new Array(deduped.length).fill(-1);
  let storyId = 0;
  for (let i = 0; i < deduped.length; i++) {
    if (assigned[i] !== -1) continue;
    const members: number[] = [i];
    for (let j = i + 1; j < deduped.length; j++) {
      if (assigned[j] !== -1) continue;
      if (jaccard(tokensCache[i], tokensCache[j]) >= STORY_SIMILARITY_THRESHOLD) {
        assigned[j] = storyId;
        members.push(j);
      }
    }
    if (members.length >= 2) {
      assigned[i] = storyId;
      clusters.push({
        id: `story:${storyId}`,
        kind: "story",
        label: `${members.length} items about "${truncate(deduped[i].title, 60)}"`,
        count: members.length,
        topItemIndex: i,
        itemIndexes: members,
      });
      storyId++;
    } else {
      assigned[i] = -2; // singleton
    }
  }

  return { dedupedEvidence: deduped, clusters };
}

function normalizeUrl(u: string): string {
  try {
    const p = new URL(u);
    return `${p.host.replace(/^www\./, "")}${p.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trim() + "…";
}
