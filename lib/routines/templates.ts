import type { ProofbaseRoutine, RoutineKind } from "./types";

export const ROUTINE_TEMPLATES: Omit<ProofbaseRoutine, "id" | "createdAt" | "updatedAt">[] = [
  {
    kind: "daily-misinformation-scan",
    title: "Daily misinformation scan",
    prompt: "Scan a topic for new claims, fact-checks, agency updates, and weakly sourced viral posts.",
    cadence: "daily-ready",
    sourceTargets: ["fact-checkers", "GDELT", "RSS", "Reddit public posts"],
  },
  {
    kind: "monitor-topic",
    title: "Monitor a topic",
    prompt: "Track public evidence and source quality for a research topic.",
    cadence: "manual",
    sourceTargets: ["news", "academic", "official sources"],
  },
  {
    kind: "prepare-debate-brief",
    title: "Prepare debate brief",
    prompt: "Build pro, con, context, rebuttal, and cross-examination notes from public evidence.",
    cadence: "manual",
    sourceTargets: ["SourceMesh", "academic", "official sources"],
  },
  {
    kind: "track-viral-claim",
    title: "Track a viral claim",
    prompt: "Search for the earliest public source, corroboration, fact-checks, and missing context.",
    cadence: "manual",
    sourceTargets: ["social metadata", "fact-checkers", "news", "official sources"],
  },
  {
    kind: "find-pro-con-arguments",
    title: "Find new pro/con arguments",
    prompt: "Collect new supporting and opposing evidence for a topic without inventing arguments.",
    cadence: "weekly-ready",
    sourceTargets: ["news", "academic", "think tanks", "official data"],
  },
];

export function createRoutineFromTemplate(kind: RoutineKind, topic: string): ProofbaseRoutine {
  const template = ROUTINE_TEMPLATES.find((item) => item.kind === kind) ?? ROUTINE_TEMPLATES[1];
  const now = new Date().toISOString();
  return {
    ...template,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: topic ? `${template.title}: ${topic}` : template.title,
    prompt: topic ? `${template.prompt} Topic: ${topic}` : template.prompt,
    createdAt: now,
    updatedAt: now,
  };
}
