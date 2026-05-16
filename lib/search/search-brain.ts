import type { SourceMeshSearchIntent } from "@/lib/types";

export type ProofbaseSearchMode =
  | "quick"
  | "research"
  | "debate"
  | "source"
  | "social"
  | "timeline"
  | "compare";

export interface ProofbaseSearchModeConfig {
  id: ProofbaseSearchMode;
  label: string;
  shortLabel: string;
  description: string;
  depth: "quick" | "deep";
  intentHint: SourceMeshSearchIntent | "timeline" | "source-analysis" | "social-analysis";
}

export const PROOFBASE_SEARCH_MODES: ProofbaseSearchModeConfig[] = [
  {
    id: "quick",
    label: "Quick Search",
    shortLabel: "Quick",
    description: "Fast source discovery for claims, URLs, domains, and broad article lookup.",
    depth: "quick",
    intentHint: "fact-check",
  },
  {
    id: "research",
    label: "Research Mode",
    shortLabel: "Research",
    description: "Deeper SourceMesh routing, evidence clustering, uncertainty, and follow-up planning.",
    depth: "deep",
    intentHint: "research-report",
  },
  {
    id: "debate",
    label: "Debate Mode",
    shortLabel: "Debate",
    description: "Find rebuttals, strongest evidence, weak points, and debate-ready context.",
    depth: "deep",
    intentHint: "debate-prep",
  },
  {
    id: "source",
    label: "Source Analysis",
    shortLabel: "Source",
    description: "Inspect source quality, publisher context, credibility signals, and missing primary sources.",
    depth: "deep",
    intentHint: "source-analysis",
  },
  {
    id: "social",
    label: "Social Analysis",
    shortLabel: "Social",
    description: "Keep social context separate from evidence while surfacing related public discussion signals.",
    depth: "deep",
    intentHint: "social-analysis",
  },
  {
    id: "timeline",
    label: "Timeline Search",
    shortLabel: "Timeline",
    description: "Prioritize dated evidence and chronological context for evolving stories.",
    depth: "deep",
    intentHint: "timeline",
  },
  {
    id: "compare",
    label: "Compare Sources",
    shortLabel: "Compare",
    description: "Prepare side-by-side framing and source-quality comparison.",
    depth: "deep",
    intentHint: "compare",
  },
];

export const SEARCH_PLACEHOLDERS: Record<ProofbaseSearchMode, string> = {
  quick: "Search a claim, article URL, social link, domain, or topic...",
  research: "Ask a deeper research question with names, dates, places, or source targets...",
  debate: "Enter a debate claim or topic to map evidence, rebuttals, and uncertainty...",
  source: "Paste a source, domain, article URL, or publisher claim to inspect...",
  social: "Paste a public social URL or viral claim to separate discussion from evidence...",
  timeline: "Search an evolving story, event, or claim with a date range if you have one...",
  compare: "Compare how sources frame the same claim, event, or controversy...",
};

export const SEARCH_CATEGORY_SUGGESTIONS = [
  "Primary sources",
  "Fact checks",
  "News coverage",
  "Research papers",
  "Legal records",
  "Social context",
  "Timeline",
  "Community notes",
];

export function getSearchModeConfig(mode: ProofbaseSearchMode): ProofbaseSearchModeConfig {
  return PROOFBASE_SEARCH_MODES.find((item) => item.id === mode) ?? PROOFBASE_SEARCH_MODES[0];
}

export function classifyProofbaseSearch(input: string): ProofbaseSearchMode {
  const value = input.trim();
  if (/\b(debate|rebuttal|argument|steelman|cross[- ]?examination)\b/i.test(value)) return "debate";
  if (/\b(timeline|chronology|when did|history of|over time)\b/i.test(value)) return "timeline";
  if (/\b(compare|versus|vs\.?|framing|both sources|side by side)\b/i.test(value)) return "compare";
  if (/\b(source quality|credible|credibility|publisher|domain|bias|about this source)\b/i.test(value)) return "source";
  if (/\b(tiktok|instagram|reddit|youtube|twitter|x.com|facebook|threads|viral|post)\b/i.test(value)) return "social";
  if (/\b(deep research|research report|brief|dossier|evidence packet)\b/i.test(value)) return "research";
  return "quick";
}

export function searchModePlan(mode: ProofbaseSearchMode): string[] {
  const config = getSearchModeConfig(mode);
  const base = [
    `Mode: ${config.label}`,
    `Depth: ${config.depth === "deep" ? "SourceMesh deep routing" : "fast routed search"}`,
  ];

  if (mode === "quick") return [...base, "Broad discovery first; no certainty claims."];
  if (mode === "research") return [...base, "Cluster evidence, expose missing context, and suggest better follow-ups."];
  if (mode === "debate") return [...base, "Separate strongest evidence from rebuttals and unresolved questions."];
  if (mode === "source") return [...base, "Prioritize source quality, publisher context, and primary-source gaps."];
  if (mode === "social") return [...base, "Keep social discussion separate from independent evidence."];
  if (mode === "timeline") return [...base, "Prefer dated evidence and chronology-ready source cards."];
  return [...base, "Prepare source-by-source framing comparison."];
}
