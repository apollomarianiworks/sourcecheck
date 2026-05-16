import { NextRequest, NextResponse } from "next/server";
import { detectMode } from "@/lib/detect-mode";
import { validateInput } from "@/lib/validate";
import { runSourceMesh } from "@/lib/sourcemesh/search";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import type { CheckMode, CheckResult, EvidenceItem, ScanDepth, SourceMeshReport } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "sourceMeshScan");
  } catch (error) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }

  let body: { input?: string; mode?: CheckMode; depth?: ScanDepth };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body.input?.trim() ?? "";
  const mode = body.mode ?? detectMode(input);
  const depth: ScanDepth = body.depth === "deep" ? "deep" : "quick";
  const validation = validateInput(mode, input);
  if (!validation.ok) return NextResponse.json({ error: validation.message ?? "Invalid input." }, { status: 400 });

  try {
    const mesh = await runSourceMesh(input, {
      maxResultsPerAdapter: depth === "deep" ? 6 : 4,
      timeoutMs: depth === "deep" ? 10_000 : 7_000,
    });

    const result = toCheckResult({
      input,
      mode,
      depth,
      mesh,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/source-mesh/check] error:", error);
    return NextResponse.json({ error: "SourceMesh check failed. Try again shortly." }, { status: 502 });
  }
}

function toCheckResult(args: {
  input: string;
  mode: CheckMode;
  depth: ScanDepth;
  mesh: Awaited<ReturnType<typeof runSourceMesh>>;
}): CheckResult {
  const { input, mode, depth, mesh } = args;
  const evidenceVerdict = verdictFromEvidence(mesh.evidence);
  const confidence = confidenceFromMesh(mesh.report.confidenceLabel, mesh.report.uncertaintyLevel, mesh.evidence.length);

  return {
    mode,
    depth,
    input,
    normalizedInput: mesh.report.understanding.cleanedInput,
    sourceQualityScore: sourceQualityScore(mesh.evidence),
    scoreFactors: [],
    evidenceVerdict,
    evidence: mesh.evidence,
    clusters: [],
    claimLabels: [
      {
        id: "sourcemesh-classification",
        text: `Recognized as ${mesh.report.understanding.recognizedAs}.`,
        tone: mesh.report.understanding.isVague ? "warn" : "neutral",
      },
      {
        id: "sourcemesh-confidence",
        text: mesh.report.confidenceLabel,
        tone: mesh.report.uncertaintyLevel === "low" ? "good" : mesh.report.uncertaintyLevel === "medium" ? "neutral" : "warn",
      },
    ],
    missingSignals: mesh.report.missingEvidence.map((text, index) => ({ id: `missing-${index}`, text })),
    searchVariants: mesh.searchVariantsUsed,
    safetyWarnings: safetyWarnings(mesh.report),
    confidence,
    suggestions: [
      ...mesh.report.suggestedBetterInputs.map((text, index) => ({ id: `better-input-${index}`, text, priority: "high" as const })),
      ...mesh.report.suggestedSearches.slice(0, 4).map((text, index) => ({ id: `followup-${index}`, text: `Try search: ${text}`, priority: "medium" as const })),
    ],
    domainAnalysis: null,
    domainIntel: null,
    pageIntel: null,
    transparency: null,
    summary: summary(mesh.report.confidenceLabel, mesh.evidence.length, mesh.report.uncertaintyLevel),
    deepReport: null,
    noEvidence: mesh.evidence.length === 0,
    checkedAt: new Date().toISOString(),
    warnings: warnings(mesh.report),
    apiStatus: {
      factcheck: apiState(mesh.coverage.find((c) => c.adapter === "googleFactCheck")?.status),
      gdelt: apiState(mesh.coverage.find((c) => c.adapter === "gdelt")?.status),
      wikipedia: apiState(mesh.coverage.find((c) => c.adapter === "wikimedia")?.status),
    },
    sourceCoverage: mesh.coverage,
    coverageLevel: mesh.coverageLevel,
    claimCategory: mesh.category,
    sourceMesh: mesh.report,
  };
}

function verdictFromEvidence(evidence: EvidenceItem[]): CheckResult["evidenceVerdict"] {
  if (evidence.length === 0) return "none";
  const factChecks = evidence.filter((e) => e.source === "Fact Check");
  const supports = factChecks.filter((e) => e.evidenceType === "supports").length;
  const disputes = factChecks.filter((e) => e.evidenceType === "disputes").length;
  if (supports > 0 && disputes > 0) return "mixed";
  if (supports > 0) return "supports";
  if (disputes > 0) return "disputes";
  return "related-only";
}

function sourceQualityScore(evidence: EvidenceItem[]): number | null {
  const scored = evidence.map((e) => e.domainScore).filter((s): s is number => typeof s === "number");
  if (scored.length === 0) return evidence.length > 0 ? 45 : null;
  return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
}

function confidenceFromMesh(
  label: SourceMeshReport["confidenceLabel"],
  uncertainty: SourceMeshReport["uncertaintyLevel"],
  evidenceCount: number
): CheckResult["confidence"] {
  const score = uncertainty === "low" ? 82 : uncertainty === "medium" ? 58 : uncertainty === "high" ? 32 : 12;
  return {
    level: uncertainty === "low" ? "high" : uncertainty === "medium" ? "medium" : evidenceCount > 0 ? "low" : "insufficient",
    score,
    rationale: `${label}. SourceMesh found ${evidenceCount} evidence item(s), but does not claim absolute truth.`,
    factors: [],
  };
}

function summary(label: string, evidenceCount: number, uncertainty: string): string {
  if (evidenceCount === 0) {
    return `${label}. SourceMesh classified the query and searched routed public sources, but no strong matching evidence was found. This is not a verdict that the claim is true or false.`;
  }
  return `${label}. SourceMesh found ${evidenceCount} public evidence item(s) and rates uncertainty as ${uncertainty}. Read the linked sources before relying on the claim.`;
}

function safetyWarnings(report: NonNullable<CheckResult["sourceMesh"]>): CheckResult["safetyWarnings"] {
  const out: CheckResult["safetyWarnings"] = [];
  if (report.understanding.isVague) out.push({ id: "vague", tone: "warn", text: "The query is vague; results may be broad or miss the intended claim." });
  if (report.social) {
    out.push({ id: "social-source", tone: "neutral", text: report.social.claimEvidenceNote });
    for (const warning of report.social.sourceQuality.warnings) out.push({ id: `social-${warning}`, tone: "warn", text: warning });
  }
  if (report.confidenceLabel === "Needs primary source") out.push({ id: "primary-needed", tone: "warn", text: "This claim type needs a primary source before drawing a strong conclusion." });
  return out;
}

function warnings(report: NonNullable<CheckResult["sourceMesh"]>): string[] {
  const failed = report.sourcesChecked
    .filter((s) => ["error", "blocked", "rate-limited", "no-key"].includes(s.status))
    .map((s) => `${s.name}: ${s.errorMessage ?? s.status}`);
  return failed.slice(0, 8);
}

function apiState(status: CheckResult["sourceCoverage"][number]["status"] | undefined): CheckResult["apiStatus"]["gdelt"] {
  if (status === "ok") return "ok";
  if (status === "rate-limited") return "rate-limited";
  if (status === "no-key") return "no-key";
  return "error";
}
