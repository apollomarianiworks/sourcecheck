import type { CheckResult } from "./types";
import { verdictLabel } from "./scoring";
import { CATEGORY_META } from "./categories";

export function resultToMarkdown(result: CheckResult): string {
  const lines: string[] = [];

  lines.push(`# SOURCE//CHECK Scan Report`);
  lines.push(``);
  lines.push(`- **Mode:** ${result.mode.toUpperCase()}`);
  lines.push(`- **Input:** ${result.input}`);
  if (result.normalizedInput && result.normalizedInput !== result.input) {
    lines.push(`- **Normalized:** ${result.normalizedInput}`);
  }
  lines.push(`- **Scanned at:** ${result.checkedAt}`);
  lines.push(`- **Verdict:** ${verdictLabel(result.evidenceVerdict)}`);
  lines.push(
    `- **Source Quality Score:** ${result.sourceQualityScore ?? "n/a"}/100`
  );
  lines.push(``);

  lines.push(`## Summary`);
  lines.push(result.summary);
  lines.push(``);

  lines.push(`## Confidence`);
  lines.push(`- **Level:** ${result.confidence.level.toUpperCase()} (${result.confidence.score}/100)`);
  lines.push(`- ${result.confidence.rationale}`);
  if (result.confidence.factors.length > 0) {
    lines.push(`### Why this confidence`);
    for (const f of result.confidence.factors) {
      const sign = f.delta >= 0 ? "+" : "";
      lines.push(`- **${f.label}** (${sign}${f.delta}) — ${f.detail}`);
    }
  }
  lines.push(``);

  if (result.safetyWarnings.length > 0) {
    lines.push(`## Safety Warnings`);
    for (const w of result.safetyWarnings) {
      lines.push(`- **[${w.tone.toUpperCase()}]** ${w.text}`);
    }
    lines.push(``);
  }

  if (result.suggestions.length > 0) {
    lines.push(`## What Would Improve This Check`);
    for (const s of result.suggestions) {
      lines.push(`- **[${s.priority.toUpperCase()}]** ${s.text}`);
    }
    lines.push(``);
  }

  if (result.claimLabels.length > 0) {
    lines.push(`## Claim Labels`);
    for (const l of result.claimLabels) {
      lines.push(`- **[${l.tone.toUpperCase()}] ${l.text}**${l.detail ? ` — ${l.detail}` : ""}`);
    }
    lines.push(``);
  }

  if (result.missingSignals.length > 0) {
    lines.push(`## Missing Signals`);
    for (const m of result.missingSignals) lines.push(`- ${m.text}`);
    lines.push(``);
  }

  if (result.searchVariants.length > 0) {
    lines.push(`## Search Variants`);
    for (const v of result.searchVariants) {
      lines.push(`- \`${v.label}\` → "${v.query}" — ${v.resultCount} result(s)`);
    }
    lines.push(``);
  }

  if (result.clusters.length > 0) {
    lines.push(`## Evidence Clusters`);
    for (const c of result.clusters) {
      lines.push(`- **${c.kind}**: ${c.label}`);
    }
    lines.push(``);
  }

  if (result.scoreFactors.length > 0) {
    lines.push(`## Why this score`);
    for (const f of result.scoreFactors) {
      const sign = f.delta >= 0 ? "+" : "";
      lines.push(`- **${f.label}** (${sign}${f.delta}) — ${f.detail ?? ""}`);
    }
    lines.push(``);
  }

  if (result.domainAnalysis) {
    const d = result.domainAnalysis;
    lines.push(`## Domain Report — ${d.domain}`);
    lines.push(`- Tier ${d.tier} · ${d.label} · ${d.finalScore}/100`);
    lines.push(`- Category: ${CATEGORY_META[d.category].label}${d.categoryInferred ? " (inferred)" : ""}`);
    lines.push(`- ${d.notes}`);
    if (d.tldBonus !== 0) lines.push(`- TLD adjustment: ${d.tldBonus > 0 ? "+" : ""}${d.tldBonus} (${d.tldNotes})`);
    lines.push(``);
  }

  if (result.domainIntel && (result.domainIntel.spoofingSignals.length > 0 || result.domainIntel.pathSignals.length > 0)) {
    lines.push(`## Domain Intelligence Warnings`);
    for (const s of result.domainIntel.spoofingSignals) lines.push(`- Spoofing: ${s}`);
    for (const s of result.domainIntel.pathSignals) lines.push(`- URL path: ${s}`);
    if (result.domainIntel.spoofedBrand) {
      lines.push(`- Closest known brand: ${result.domainIntel.spoofedBrand}`);
    }
    lines.push(``);
  }

  if (result.pageIntel) {
    const p = result.pageIntel;
    lines.push(`## Citation Quality Scan`);
    if (!p.fetched) {
      lines.push(`- Page could not be fetched: ${p.fetchError ?? "unknown error"}`);
    } else {
      if (p.title)         lines.push(`- Title: ${p.title}`);
      if (p.byline)        lines.push(`- Byline: ${p.byline} (via ${p.bylineSource})`);
      else                  lines.push(`- Byline: not detected`);
      if (p.publishedAt)   lines.push(`- Published: ${p.publishedAt.slice(0, 10)} (${p.freshnessLabel})`);
      else                  lines.push(`- Published: not detected`);
      if (p.modifiedAt && p.modifiedAt !== p.publishedAt) lines.push(`- Modified: ${p.modifiedAt.slice(0, 10)}`);
      lines.push(`- Outbound links: ${p.outboundLinks} (${p.outboundDomains.length} domain(s))`);
      lines.push(`- Internal links: ${p.internalLinks}`);
      lines.push(`- Structured metadata: ${[p.hasJsonLd ? "JSON-LD" : "", p.hasOpenGraph ? "OpenGraph" : ""].filter(Boolean).join(", ") || "none"}`);
      lines.push(`- About link: ${p.hasAboutLink ? "yes" : "no"}; Contact link: ${p.hasContactLink ? "yes" : "no"}; Corrections page: ${p.hasCorrectionsLink ? "yes" : "no"}`);
      lines.push(`- Word count: ~${p.wordCount}`);
      if (p.clickbaitScore !== null) {
        lines.push(`- Clickbait score: ${p.clickbaitScore}/100 (${p.clickbaitLevel})`);
        for (const s of p.clickbaitSignals) lines.push(`  - ${s}`);
      }
    }
    lines.push(``);
  }

  if (result.transparency) {
    lines.push(`## Source Transparency — ${result.transparency.score}/100 (${result.transparency.level})`);
    for (const f of result.transparency.factors) {
      const sign = f.delta >= 0 ? "+" : "";
      lines.push(`- **${f.label}** (${sign}${f.delta}) — ${f.detail}`);
    }
    lines.push(``);
  }

  lines.push(`## API Status`);
  lines.push(`- Fact Check: ${result.apiStatus.factcheck}`);
  lines.push(`- GDELT: ${result.apiStatus.gdelt}`);
  lines.push(`- Wikipedia: ${result.apiStatus.wikipedia}`);
  lines.push(``);

  if (result.warnings.length > 0) {
    lines.push(`## Warnings`);
    for (const w of result.warnings) lines.push(`- ${w}`);
    lines.push(``);
  }

  if (result.evidence.length > 0) {
    lines.push(`## Evidence (${result.evidence.length})`);
    for (const e of result.evidence) {
      lines.push(`### [${e.source}] ${e.title}`);
      lines.push(`- Type: ${e.evidenceType.toUpperCase()}`);
      lines.push(`- Publisher: ${e.publisher}`);
      lines.push(`- Domain: ${e.domain}${e.domainScore !== null ? ` (score ${e.domainScore})` : ""}${e.domainTier && e.domainTier !== "?" ? ` · Tier ${e.domainTier}` : ""}`);
      if (e.date) lines.push(`- Date: ${e.date}`);
      if (e.rating) lines.push(`- Rating: ${e.rating}`);
      lines.push(`- URL: ${e.url}`);
      lines.push(``);
      lines.push(e.snippet);
      lines.push(``);
    }
  } else {
    lines.push(`## Evidence`);
    lines.push(`_No evidence returned by any source._`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(
    `_Generated by SOURCE//CHECK. Source Quality Score reflects outlet credibility, not truth. Always verify with primary sources._`
  );

  return lines.join("\n");
}

export function resultToPlainText(result: CheckResult): string {
  return resultToMarkdown(result).replace(/[#*_`]/g, "");
}
