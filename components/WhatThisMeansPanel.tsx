"use client";

import type { CheckResult } from "@/lib/types";

interface Props { result: CheckResult; }

/**
 * Plain-English explanation of what the verdict actually means and what it does NOT mean.
 * Uses the locked phrasing — never "100% true/false", never "AI verified".
 */
export default function WhatThisMeansPanel({ result }: Props) {
  const blocks = build(result);

  return (
    <div className="card p-4 space-y-3">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">What this means</div>

      <div className="space-y-2.5">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-[14px] leading-none mt-0.5 shrink-0" aria-hidden="true">{b.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-ink">{b.heading}</div>
              <p className="text-[13px] text-ink-body leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Block { icon: string; heading: string; body: string; }

function build(result: CheckResult): Block[] {
  const blocks: Block[] = [];
  const fcCount = result.evidence.filter((e) => e.source === "Fact Check").length;
  const newsCount = result.evidence.filter((e) => e.source === "GDELT").length;
  const wikiCount = result.evidence.filter((e) => e.source === "Wikipedia").length;

  // 1) The verdict itself, in plain English
  blocks.push(verdictBlock(result.evidenceVerdict, fcCount));

  // 2) What the score reflects
  if (result.sourceQualityScore !== null) {
    blocks.push({
      icon: "📊",
      heading: "About the Source Quality Score",
      body: `${result.sourceQualityScore}/100 reflects the credibility of the outlets covering this topic — not the truth of the claim. ` +
            `A high score means reputable publishers are involved; it does not prove the underlying statement.`,
    });
  }

  // 3) What we did NOT do
  blocks.push({
    icon: "✋",
    heading: "What we did NOT do",
    body:
      "We did not use any language model to invent a verdict. " +
      "We did not bypass paywalls. " +
      "We did not scrape sites recursively. " +
      "Every evidence card links to a real source you can open and read.",
  });

  // 4) Edge-case caveats
  if (fcCount === 0 && (newsCount > 0 || wikiCount > 0)) {
    blocks.push({
      icon: "ℹ",
      heading: "No dedicated fact-check matched",
      body: "No fact-checker rated this exact phrasing. The items below are context (news / encyclopedia) — they describe the topic but do not constitute a verdict.",
    });
  }
  if (result.coverageLevel === "low") {
    blocks.push({
      icon: "⚠",
      heading: "Low source coverage",
      body: "Few adapters returned results. Treat the verdict cautiously and check primary sources before relying on this.",
    });
  }

  return blocks;
}

function verdictBlock(v: CheckResult["evidenceVerdict"], fcCount: number): Block {
  switch (v) {
    case "supports":
      return {
        icon: "✓",
        heading: "Evidence suggests this is supported",
        body: `${fcCount} fact-check review${fcCount === 1 ? "" : "s"} rated the matching claim as accurate. This is NOT a guarantee of truth — fact-checkers can be wrong, claims can change with time, and phrasing matters.`,
      };
    case "disputes":
      return {
        icon: "✗",
        heading: "Evidence suggests this is disputed",
        body: `${fcCount} fact-check review${fcCount === 1 ? "" : "s"} rated the matching claim as false, misleading, or unsupported. This is NOT a guarantee of falsehood — read the disputing sources to understand exactly what was rated and why.`,
      };
    case "mixed":
      return {
        icon: "◐",
        heading: "Conflicting reports detected",
        body: "Different reviewers reached different conclusions. The claim probably depends on how it's framed or which version is being rated. Read the conflicting fact-checks directly.",
      };
    case "related-only":
      return {
        icon: "○",
        heading: "Limited evidence found",
        body: "No fact-checker has rated this exact phrasing. Related coverage exists but does not constitute a verdict. Consider rewording the claim with more specific names, dates, or numbers.",
      };
    case "none":
      return {
        icon: "○",
        heading: "Insufficient evidence found",
        body: "No items returned from any consulted source. Absence of coverage is not a verdict — it may mean the topic is too new, too niche, or in another language. Try a different wording.",
      };
  }
}
