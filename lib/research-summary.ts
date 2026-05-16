import type { CheckResult, EvidenceItem } from "./types";

/**
 * Build a structured research summary using LOCKED phrasing.
 *
 * MUST use one of these openers (matching the verdict):
 *   - "Evidence found supports..."
 *   - "Evidence found disputes..."
 *   - "Evidence is mixed..."
 *   - "Insufficient evidence found..."
 *
 * MUST NEVER say "100% true", "100% false", "proven", "definitively", or imply
 * absolute truth. The summary phrasing here is intentionally constrained.
 */

export interface ResearchSummary {
  headline: string;           // one-liner using the locked phrasing
  body: string;               // 2-3 short paragraphs
  strongest: string[];        // bullet items
  weakest: string[];
  reliabilityNotes: string[]; // honest caveats about how the result was derived
  limitations: string[];      // what this scan CANNOT tell you
}

interface BuildArgs {
  input: string;
  mode: CheckResult["mode"];
  verdict: CheckResult["evidenceVerdict"];
  evidence: EvidenceItem[];
  sourceQualityScore: number | null;
  claimLabels: CheckResult["claimLabels"];
  apiStatus: CheckResult["apiStatus"];
}

export function buildResearchSummary(args: BuildArgs): ResearchSummary {
  const { input, mode, verdict, evidence, sourceQualityScore, claimLabels, apiStatus } = args;

  const fc       = evidence.filter((e) => e.source === "Fact Check");
  const news     = evidence.filter((e) => e.source === "GDELT");
  const wiki     = evidence.filter((e) => e.source === "Wikipedia");
  const reliable = evidence.filter((e) => (e.domainScore ?? 0) >= 70);
  const lowTier  = evidence.filter((e) => (e.domainScore ?? 50) < 50);

  const subject = quoteTruncate(input, 120);

  // ── Headline (LOCKED phrasing) ──
  const headline = (() => {
    switch (verdict) {
      case "supports":     return `Evidence found supports the claim that ${subject}.`;
      case "disputes":     return `Evidence found disputes the claim that ${subject}.`;
      case "mixed":        return `Evidence is mixed regarding the claim that ${subject}.`;
      case "related-only": return `Insufficient direct evidence found for the claim that ${subject}. Related coverage exists, but no fact-checkers ruled on this phrasing.`;
      case "none":         return `Insufficient evidence found regarding ${subject}.`;
    }
  })();

  // ── Body ──
  const bodyParts: string[] = [];

  // Coverage paragraph
  const coverageBits: string[] = [];
  if (fc.length > 0)   coverageBits.push(`${fc.length} fact-check review${fc.length === 1 ? "" : "s"}`);
  if (news.length > 0) coverageBits.push(`${news.length} news article${news.length === 1 ? "" : "s"}`);
  if (wiki.length > 0) coverageBits.push(`${wiki.length} encyclopedia entr${wiki.length === 1 ? "y" : "ies"}`);

  if (coverageBits.length > 0) {
    bodyParts.push(
      `The scan reviewed ${coverageBits.join(", ")} returned across ` +
      `Google Fact Check Tools, GDELT, and Wikipedia. ` +
      (sourceQualityScore !== null
        ? `Median outlet credibility (Source Quality Score) is ${sourceQualityScore}/100.`
        : `A Source Quality Score could not be computed for this input.`)
    );
  } else {
    bodyParts.push(
      `No items were returned from Google Fact Check Tools, GDELT, or Wikipedia within their accessible windows. ` +
      `Absence of coverage is not the same as the claim being false — it may simply mean no outlet has weighed in publicly on this exact phrasing.`
    );
  }

  // Verdict paragraph — uses neutral, evidence-pointing language
  if (verdict === "supports" && fc.length > 0) {
    const bestFc = fc[0];
    bodyParts.push(
      `${fc.length} fact-check review${fc.length === 1 ? "" : "s"} rated the matching claim as true or accurate. ` +
      `The highest-credibility reviewer was ${bestFc.publisher} (${bestFc.domain}, ${bestFc.domainScore ?? "—"}/100). ` +
      `This does not mean the claim is "100% true" — it means published fact-checkers, on balance, found supporting evidence.`
    );
  } else if (verdict === "disputes" && fc.length > 0) {
    const bestFc = fc[0];
    bodyParts.push(
      `${fc.length} fact-check review${fc.length === 1 ? "" : "s"} rated the matching claim as false, misleading, or unsupported. ` +
      `The highest-credibility reviewer was ${bestFc.publisher} (${bestFc.domain}, ${bestFc.domainScore ?? "—"}/100). ` +
      `This does not mean the claim is "100% false" — it means published fact-checkers, on balance, found the claim is not supported by available evidence.`
    );
  } else if (verdict === "mixed") {
    bodyParts.push(
      `Fact-check reviewers returned conflicting verdicts on this claim. Different publishers reached different conclusions, which usually signals that the claim depends on how it is phrased, framed, or scoped. The evidence here is genuinely contested.`
    );
  } else if (verdict === "related-only" && evidence.length > 0) {
    bodyParts.push(
      `No fact-checker rated this exact phrasing. ${evidence.length} item${evidence.length === 1 ? "" : "s"} returned describe the surrounding topic but do not directly evaluate the claim as worded. Treat them as context, not as a verdict.`
    );
  } else if (verdict === "none") {
    bodyParts.push(
      `Without coverage in any of the consulted sources, no defensible verdict can be offered. If the claim is recent (less than a few hours old) it may not yet be indexed. If it is older than 30 days, GDELT will not return it.`
    );
  }

  // Reliability paragraph
  if (lowTier.length > 0 && reliable.length === 0) {
    bodyParts.push(
      `All returned outlets scored under 50 on the credibility scale. Treat the surface coverage with caution — these sources have limited editorial oversight on file.`
    );
  } else if (reliable.length >= 2) {
    const domains = Array.from(new Set(reliable.map((r) => r.domain))).slice(0, 3).join(", ");
    bodyParts.push(
      `Multiple high-credibility outlets (${domains}) are present in the evidence, which strengthens the corroboration signal — but does not, by itself, prove the underlying claim.`
    );
  }

  const body = bodyParts.join("\n\n");

  // ── Strongest / Weakest ──
  const strongestList = [...evidence]
    .filter((e) => e.domainScore !== null)
    .sort((a, b) => (b.domainScore ?? 0) - (a.domainScore ?? 0))
    .slice(0, 3)
    .map((e) => `${e.publisher} (${e.domain}, ${e.domainScore}/100): ${e.title}`);

  const weakestList = [...evidence]
    .filter((e) => e.domainScore !== null)
    .sort((a, b) => (a.domainScore ?? 0) - (b.domainScore ?? 0))
    .slice(0, 3)
    .map((e) => `${e.publisher} (${e.domain}, ${e.domainScore}/100): ${e.title}`);

  // ── Reliability notes ──
  const reliabilityNotes: string[] = [];
  reliabilityNotes.push(
    "Source Quality Score is a measure of outlet credibility, not of whether the underlying claim is true."
  );
  if (fc.length > 0) {
    reliabilityNotes.push(
      "Stance labels (supports/disputes) come only from fact-checks whose claim text materially overlaps the query. Items with low overlap were demoted to 'related'."
    );
  } else {
    reliabilityNotes.push(
      "No fact-checker has rated this exact phrasing. Stance is therefore not asserted — only contextual coverage is shown."
    );
  }
  if (apiStatus.factcheck === "no-key") {
    reliabilityNotes.push(
      "Google Fact Check Tools was skipped because FACTCHECK_API_KEY is not set. Configuring it would strengthen this report."
    );
  }
  for (const l of claimLabels) {
    if (l.id === "needs-primary") {
      reliabilityNotes.push(
        "The claim references topics (study / government / legal) that warrant a primary source. None was returned among the evidence."
      );
    }
  }

  // ── Limitations (what this scan cannot do) ──
  const limitations: string[] = [
    "GDELT news coverage only extends back ~30 days.",
    "Wikipedia and GDELT do not assert stance — they are context, not verdict.",
    "Page content is not scraped beyond a single GET; paywalled or login-gated articles cannot be inspected.",
    "Non-English claims may return little or no English-language coverage.",
    "This tool does not establish truth. It surfaces what credible outlets have said and how strongly they have said it.",
  ];
  if (mode === "url") {
    limitations.push("Some publishers block automated fetches; in those cases only domain-level signals are available.");
  }

  return {
    headline,
    body,
    strongest: strongestList,
    weakest: weakestList,
    reliabilityNotes,
    limitations,
  };
}

function quoteTruncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return `"${clean}"`;
  return `"${clean.slice(0, n - 1).trim()}…"`;
}

/**
 * Final-form copyable report — structured plain-text/markdown.
 * Strictly the format the user requested in PASS 6.
 */
export function reportToMarkdown(args: BuildArgs & { summary: ResearchSummary }): string {
  const { input, mode, evidence, summary } = args;
  const lines: string[] = [];

  lines.push(`SOURCE//CHECK RESEARCH REPORT`);
  lines.push(`================================`);
  lines.push(``);
  lines.push(`CLAIM CHECKED:`);
  lines.push(`  ${input}`);
  lines.push(``);
  lines.push(`MODE: ${mode.toUpperCase()}`);
  lines.push(``);
  lines.push(`HEADLINE FINDING:`);
  lines.push(`  ${summary.headline}`);
  lines.push(``);
  lines.push(`SOURCES REVIEWED: ${evidence.length}`);
  const domains = Array.from(new Set(evidence.map((e) => e.domain))).slice(0, 10);
  for (const d of domains) lines.push(`  · ${d}`);
  lines.push(``);
  lines.push(`STRONGEST EVIDENCE:`);
  if (summary.strongest.length === 0) lines.push("  (none with a credibility score)");
  for (const s of summary.strongest) lines.push(`  · ${s}`);
  lines.push(``);
  lines.push(`WEAKEST EVIDENCE:`);
  if (summary.weakest.length === 0) lines.push("  (none with a credibility score)");
  for (const s of summary.weakest) lines.push(`  · ${s}`);
  lines.push(``);
  lines.push(`RELIABILITY NOTES:`);
  for (const n of summary.reliabilityNotes) lines.push(`  · ${n}`);
  lines.push(``);
  lines.push(`LIMITATIONS:`);
  for (const l of summary.limitations) lines.push(`  · ${l}`);
  lines.push(``);
  lines.push(`FULL ANALYSIS:`);
  for (const para of summary.body.split("\n\n")) {
    lines.push(`  ${para}`);
    lines.push(``);
  }
  lines.push(`---`);
  lines.push(`Generated by SOURCE//CHECK. This is a source-quality scan, not a truth verdict.`);
  return lines.join("\n");
}
