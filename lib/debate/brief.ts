import { runSourceMesh } from "@/lib/sourcemesh/search";
import type { EvidenceItem, SourceMeshConfidenceLabel } from "@/lib/types";

export interface DebateBrief {
  topic: string;
  generatedAt: string;
  uncertainty: SourceMeshConfidenceLabel;
  pro: DebateSide;
  con: DebateSide;
  neutralContext: DebateSide;
  fallaciesToWatch: string[];
  crossExaminationQuestions: string[];
  missingEvidence: string[];
  searchesRun: string[];
}

export interface DebateSide {
  label: "pro" | "con" | "context";
  query: string;
  strongestClaims: string[];
  evidence: EvidenceItem[];
  rebuttalQuestions: string[];
}

export async function buildDebateBrief(topic: string): Promise<DebateBrief> {
  const cleaned = topic.trim();
  const proQuery = `${cleaned} benefits evidence support`;
  const conQuery = `${cleaned} criticism risks evidence`;
  const contextQuery = `${cleaned} background timeline statistics`;

  const [pro, con, context] = await Promise.all([
    runSourceMesh(proQuery, { maxResultsPerAdapter: 3, timeoutMs: 7_000 }),
    runSourceMesh(conQuery, { maxResultsPerAdapter: 3, timeoutMs: 7_000 }),
    runSourceMesh(contextQuery, { maxResultsPerAdapter: 3, timeoutMs: 7_000 }),
  ]);

  const allMissing = [...pro.report.missingEvidence, ...con.report.missingEvidence, ...context.report.missingEvidence];

  return {
    topic: cleaned,
    generatedAt: new Date().toISOString(),
    uncertainty: weakestConfidence([pro.report.confidenceLabel, con.report.confidenceLabel, context.report.confidenceLabel]),
    pro: side("pro", proQuery, pro.evidence),
    con: side("con", conQuery, con.evidence),
    neutralContext: side("context", contextQuery, context.evidence),
    fallaciesToWatch: [
      "Cherry-picking one source while ignoring contradictory evidence.",
      "Treating popularity, virality, or outrage as proof.",
      "Moving from a true narrow fact to an unsupported broad conclusion.",
      "Confusing correlation, expert disagreement, or uncertainty with proof of either side.",
    ],
    crossExaminationQuestions: [
      "What primary source would change your mind?",
      "Which part of the opposing evidence is strongest?",
      "Are we debating a factual claim, a value judgment, or a policy tradeoff?",
      "What dates, location, population, or definition would narrow this argument?",
    ],
    missingEvidence: Array.from(new Set(allMissing)).slice(0, 8),
    searchesRun: Array.from(new Set([
      ...pro.searchVariantsUsed.map((v) => v.query),
      ...con.searchVariantsUsed.map((v) => v.query),
      ...context.searchVariantsUsed.map((v) => v.query),
    ])).slice(0, 18),
  };
}

function side(label: DebateSide["label"], query: string, evidence: EvidenceItem[]): DebateSide {
  return {
    label,
    query,
    strongestClaims: evidence.slice(0, 4).map((item) => `${item.publisher}: ${item.title}`),
    evidence: evidence.slice(0, 8),
    rebuttalQuestions: [
      "Does this source directly address the debate topic or only a related claim?",
      "Is this source primary, expert analysis, journalism, or public discussion?",
      "What evidence would weaken this point?",
    ],
  };
}

function weakestConfidence(labels: SourceMeshConfidenceLabel[]): SourceMeshConfidenceLabel {
  const order: SourceMeshConfidenceLabel[] = [
    "Opinion/not fact-checkable",
    "Too vague to verify",
    "No strong evidence found",
    "Needs primary source",
    "Mixed evidence",
    "Weak evidence found",
    "Moderate evidence found",
    "Strong evidence found",
  ];
  return labels.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "No strong evidence found";
}
