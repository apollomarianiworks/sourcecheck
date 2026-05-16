import { ALL_ADAPTER_IDS, SOURCE_ADAPTERS } from "@/lib/sources";
import type { SourceMeshSourceChecked } from "@/lib/types";

export interface SourceRegistryEntry {
  id: string;
  name: string;
  available: boolean;
  requiresKey: boolean;
  optional: boolean;
  envVar?: string;
  quality: SourceMeshSourceChecked["quality"];
  notes: string;
}

const OPTIONAL_INTEGRATIONS = [
  { id: "brave", name: "Brave Search API", envVar: "BRAVE_SEARCH_API_KEY", notes: "Optional web search expansion; not required." },
  { id: "newsapi", name: "NewsAPI", envVar: "NEWSAPI_KEY", notes: "Optional news API free-tier integration; not required." },
  { id: "mediastack", name: "MediaStack", envVar: "MEDIASTACK_API_KEY", notes: "Optional news API free-tier integration; not required." },
];

const QUALITY: Record<string, SourceMeshSourceChecked["quality"]> = {
  googleFactCheck: "high",
  gdelt: "context",
  wikimedia: "context",
  arxiv: "medium",
  crossref: "medium",
  pubmed: "high",
  openalex: "medium",
  courtlistener: "primary",
  hackernews: "weak",
  reddit: "weak",
  rss: "high",
};

const NOTES: Record<string, string> = {
  googleFactCheck: "Dedicated fact-check database; requires a Google Fact Check API key.",
  gdelt: "Public news index, useful for recent coverage; does not provide truth verdicts.",
  wikimedia: "Encyclopedic context; not a live fact-check source.",
  arxiv: "Preprints; useful for technical/science claims but not peer-review proof.",
  crossref: "Scholarly metadata; verifies that papers exist, not whether claims are correct.",
  pubmed: "Biomedical literature and abstracts; strongest for health research discovery.",
  openalex: "Open scholarly graph; useful for broad research discovery.",
  courtlistener: "Public legal opinions and dockets where available.",
  hackernews: "Public discussion; weak evidence, good for tech context discovery.",
  reddit: "Public posts only where accessible; weak evidence, useful for rumor/source tracing.",
  rss: "Curated public feeds, including agencies and fact-checkers; headline-level unless opened.",
};

export function sourceRegistry(): SourceRegistryEntry[] {
  const builtIn = ALL_ADAPTER_IDS.map((id) => {
    const adapter = SOURCE_ADAPTERS[id];
    return {
      id,
      name: adapter.name,
      available: adapter.available(),
      requiresKey: adapter.requiresKey,
      optional: adapter.requiresKey,
      quality: QUALITY[id] ?? "context",
      notes: NOTES[id] ?? "Public source adapter.",
    };
  });

  const optional = OPTIONAL_INTEGRATIONS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    available: !!process.env[entry.envVar],
    requiresKey: true,
    optional: true,
    envVar: entry.envVar,
    quality: "context" as const,
    notes: entry.notes,
  }));

  return [...builtIn, ...optional];
}

export function optionalIntegrationStatus() {
  return OPTIONAL_INTEGRATIONS.map((entry) => ({
    name: entry.name,
    envVar: entry.envVar,
    status: process.env[entry.envVar] ? ("available" as const) : ("missing" as const),
    notes: entry.notes,
  }));
}
