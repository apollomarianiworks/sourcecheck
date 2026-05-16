import type { EvidenceItem, SourceMeshEvidenceMap } from "@/lib/types";

const SOURCE_BASE: Record<EvidenceItem["source"], number> = {
  "Fact Check": 95,
  "Domain DB": 60,
  GDELT: 55,
  Wikipedia: 50,
};

const RELEVANCE: Record<EvidenceItem["relevance"], number> = {
  high: 20,
  medium: 10,
  low: 0,
};

export function rankEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
  return evidence.slice().sort((a, b) => scoreEvidence(b) - scoreEvidence(a));
}

export function scoreEvidence(item: EvidenceItem): number {
  const source = SOURCE_BASE[item.source] ?? 45;
  const domain = item.domainScore ?? 45;
  const relevance = RELEVANCE[item.relevance];
  const dated = item.date ? 5 : 0;
  return Math.round(source * 0.35 + domain * 0.35 + relevance + dated);
}

export function buildEvidenceMap(evidence: EvidenceItem[]): SourceMeshEvidenceMap {
  const ranked = rankEvidence(evidence);
  const bySource = countBy(evidence.map((e) => e.publisher || e.source)).map(([source, count]) => ({
    source,
    count,
    quality: sourceQuality(evidence.find((e) => (e.publisher || e.source) === source)),
  }));

  const byStance = countBy(evidence.map((e) => e.evidenceType)).map(([stance, count]) => ({
    stance: stance as EvidenceItem["evidenceType"],
    count,
  }));

  return {
    strongest: ranked.slice(0, 3),
    weakest: ranked.slice(-3).reverse(),
    bySource,
    byStance,
  };
}

function countBy(values: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function sourceQuality(item: EvidenceItem | undefined): string {
  if (!item) return "unknown";
  if (item.source === "Fact Check") return "dedicated fact-check";
  if ((item.domainScore ?? 0) >= 75) return "high-quality source";
  if ((item.domainScore ?? 0) >= 55) return "context source";
  return "weak or unscored source";
}
