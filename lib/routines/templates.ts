import type { ProofbaseRoutine, RoutineKind, RoutineSourceTarget } from "./types";

type Template = Omit<ProofbaseRoutine, "id" | "createdAt" | "updatedAt" | "lastRunAt">;

function target(label: string, type: RoutineSourceTarget["type"], value: string): RoutineSourceTarget {
  return { id: `${type}-${value}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, type, value };
}

export const ROUTINE_TEMPLATES: Template[] = [
  {
    kind: "topic-watch",
    title: "Topic Watch",
    description: "Monitor a topic, person, company, ideology, controversy, or world event.",
    prompt: "Monitor this topic for new public evidence, confidence changes, conflicting reporting, and context gaps.",
    cadence: "manual",
    tags: ["monitoring", "topic"],
    sourceTargets: [target("GDELT news", "adapter", "gdelt"), target("RSS feeds", "adapter", "rss"), target("Wikipedia context", "adapter", "wikimedia")],
    querySeeds: ["latest developments", "official statement", "fact check", "timeline"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "Manual runs only. Scheduling can use Vercel Cron, Firebase scheduled functions, or Cloudflare Cron later." },
  },
  {
    kind: "debate-prep",
    title: "Debate Prep",
    description: "Build recurring pro/con research for policy, politics, social issues, and philosophy.",
    prompt: "Prepare strongest arguments for and against this topic with evidence gaps, rebuttals, and expert sources.",
    cadence: "manual",
    tags: ["debate", "arguments"],
    sourceTargets: [target("Academic sources", "source-type", "academic"), target("Official data", "source-type", "official"), target("News context", "source-type", "news")],
    querySeeds: ["pro arguments evidence", "con arguments evidence", "statistics", "expert analysis", "rebuttals"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "Manual debate refreshes only in this phase." },
  },
  {
    kind: "source-monitor",
    title: "Source Monitor",
    description: "Watch specific websites, RSS feeds, journals, government sources, or outlets.",
    prompt: "Monitor this source or domain for relevant new evidence and source-quality changes.",
    cadence: "manual",
    tags: ["source", "rss", "domain"],
    sourceTargets: [target("RSS feeds", "rss", "custom"), target("Domain/source quality", "source-type", "domain"), target("Official releases", "source-type", "official")],
    querySeeds: ["latest", "press release", "filing", "update"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "RSS/domain scheduled polling is future-ready only." },
  },
  {
    kind: "social-claim-monitor",
    title: "Social Claim Monitor",
    description: "Track viral claims and social narratives without scraping private content.",
    prompt: "Monitor this social claim or narrative for corroborating evidence, weak sourcing, misinformation risk, and context gaps.",
    cadence: "manual",
    tags: ["social", "claims", "narratives"],
    sourceTargets: [target("YouTube public metadata", "platform", "youtube"), target("TikTok public metadata", "platform", "tiktok"), target("Reddit public posts", "platform", "reddit"), target("X/Twitter public context", "platform", "x-twitter")],
    querySeeds: ["viral claim", "fact check", "original source", "corroborating evidence", "misinformation"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "No private scraping or login-gated monitoring." },
  },
  {
    kind: "research-digest",
    title: "Research Digest",
    description: "Generate a repeatable evidence digest for an ongoing research area.",
    prompt: "Create a research digest with new articles, official sources, studies, and unresolved questions.",
    cadence: "weekly-ready",
    tags: ["digest", "research"],
    sourceTargets: [target("OpenAlex", "adapter", "openalex"), target("Crossref", "adapter", "crossref"), target("Semantic Scholar", "adapter", "semanticScholar"), target("News/RSS", "source-type", "news")],
    querySeeds: ["new research", "literature review", "policy update", "latest evidence"],
    visibility: "share-ready",
    schedule: { enabled: false, provider: "manual-only", note: "Weekly scheduling is future-ready only." },
  },
  {
    kind: "trend-scanner",
    title: "Trend Scanner",
    description: "Look for emerging public narratives and repeated weak claims.",
    prompt: "Scan for emerging claims, repeated narratives, and weak evidence patterns around this topic.",
    cadence: "manual",
    tags: ["trends", "narratives"],
    sourceTargets: [target("GDELT news", "adapter", "gdelt"), target("Reddit public posts", "adapter", "reddit"), target("Hacker News", "adapter", "hackernews")],
    querySeeds: ["trend", "viral", "controversy", "discussion", "claim"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "No fake live trend data. This runs only when the user clicks run." },
  },
  {
    kind: "daily-briefing",
    title: "Daily Briefing",
    description: "Prepare a daily-style manual brief for topics you care about.",
    prompt: "Create a concise briefing with evidence updates, source quality, and next checks.",
    cadence: "daily-ready",
    tags: ["briefing", "daily"],
    sourceTargets: [target("News", "source-type", "news"), target("Official sources", "source-type", "official"), target("Fact-checkers", "source-type", "fact-check")],
    querySeeds: ["today", "latest", "official update", "fact check"],
    visibility: "share-ready",
    schedule: { enabled: false, provider: "manual-only", note: "Daily scheduling can be enabled later with a real scheduler." },
  },
  {
    kind: "collection-updater",
    title: "Collection Updater",
    description: "Refresh a saved research collection with new evidence and gaps.",
    prompt: "Update this collection topic with new evidence, stronger sources, and unresolved questions.",
    cadence: "manual",
    tags: ["collections", "organize"],
    sourceTargets: [target("Saved collections", "collection", "local"), target("SourceMesh", "source-type", "sourcemesh")],
    querySeeds: ["new evidence", "missing primary source", "timeline update"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "Cloud collection syncing is future-ready only." },
  },
  {
    kind: "article-finder",
    title: "Article Finder",
    description: "Find useful articles, analysis, papers, and source packets.",
    prompt: "Find strong articles and research sources for this topic, including different viewpoints.",
    cadence: "manual",
    tags: ["articles", "discovery"],
    sourceTargets: [target("News/RSS", "source-type", "news"), target("Academic indexes", "source-type", "academic"), target("Optional web search", "adapter", "brave")],
    querySeeds: ["best articles", "analysis", "longform", "research paper", "opposing view"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "Optional web search requires user-provided keys." },
  },
  {
    kind: "context-monitor",
    title: "Context Monitor",
    description: "Track background context, definitions, timelines, and controversy explanations.",
    prompt: "Monitor context changes, definitions, timelines, and why this issue is controversial.",
    cadence: "manual",
    tags: ["context", "definitions", "timeline"],
    sourceTargets: [target("Wikipedia context", "adapter", "wikimedia"), target("Official sources", "source-type", "official"), target("News/RSS", "source-type", "news")],
    querySeeds: ["background", "timeline", "definition", "why controversial", "context"],
    visibility: "private-local",
    schedule: { enabled: false, provider: "manual-only", note: "Context monitoring is manual until scheduling exists." },
  },
];

export function templateFor(kind: RoutineKind): Template {
  return ROUTINE_TEMPLATES.find((item) => item.kind === kind) ?? ROUTINE_TEMPLATES[0];
}

export function createRoutineFromTemplate(kind: RoutineKind, topic: string): ProofbaseRoutine {
  const template = templateFor(kind);
  const now = new Date().toISOString();
  const topicText = topic.trim();
  return {
    ...template,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: topicText ? `${template.title}: ${topicText}` : template.title,
    prompt: topicText ? `${template.prompt} Topic: ${topicText}` : template.prompt,
    querySeeds: topicText ? [topicText, ...template.querySeeds] : template.querySeeds,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
  };
}

export function duplicateRoutine(routine: ProofbaseRoutine): ProofbaseRoutine {
  const now = new Date().toISOString();
  return {
    ...routine,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${routine.title} copy`,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    visibility: "private-local",
  };
}
