"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { verdictLabel } from "@/lib/scoring";
import { resultToMarkdown } from "@/lib/export";

interface Props { result: CheckResult; }

/**
 * Public share menu — four copy actions:
 *  - Short summary (2-3 sentences)
 *  - Source list (URLs + publisher names)
 *  - Social post (one-liner, ≤280 chars)
 *  - Full report (markdown, same as ExportButton)
 *
 * Also exposes native navigator.share when available + Twitter / Bluesky intents.
 */
export default function ShareMenu({ result }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const pageHref = typeof window !== "undefined" ? window.location.href : "";
  const verdict = verdictLabel(result.evidenceVerdict);
  const score = result.sourceQualityScore !== null
    ? ` Source Quality Score: ${result.sourceQualityScore}/100.`
    : "";
  const inputShort = result.input.length > 140 ? result.input.slice(0, 137).trim() + "…" : result.input;

  const summaryText =
`Proofbase — "${inputShort}"

${verdict}.${score}
${result.summary}

— ${result.evidence.length} source${result.evidence.length === 1 ? "" : "s"} reviewed${pageHref ? `\n${pageHref}` : ""}`;

  const sourceListText = result.evidence.length === 0
    ? `Proofbase — "${inputShort}"\n\nNo sources returned.`
    : `Proofbase — "${inputShort}"\n\nSources reviewed (${result.evidence.length}):\n` +
      result.evidence.map((e) => `- [${e.source}] ${e.title}\n  ${e.url}`).join("\n");

  const socialPost = buildSocialPost(verdict, inputShort, result.sourceQualityScore, pageHref);

  async function copy(label: string, text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(label);
    } catch {
      setCopied(label + ":err");
    } finally {
      setTimeout(() => setCopied(null), 1700);
    }
  }

  async function nativeShare() {
    if (!navigator.share) return copy("Summary", summaryText);
    try { await navigator.share({ title: "Proofbase result", text: summaryText }); }
    catch { /* user cancelled — ignore */ }
  }

  function intent(prefix: string) {
    const text = encodeURIComponent(socialPost);
    const url = encodeURIComponent(pageHref);
    return `${prefix}?text=${text}&url=${url}`;
  }

  const buttons: { label: string; key: string; onClick: () => void; primary?: boolean }[] = [
    { label: "Copy summary",      key: "Summary",     onClick: () => copy("Summary", summaryText),       primary: true },
    { label: "Copy source list",  key: "SourceList",  onClick: () => copy("SourceList", sourceListText) },
    { label: "Copy social post",  key: "SocialPost",  onClick: () => copy("SocialPost", socialPost) },
    { label: "Copy full report",  key: "FullReport",  onClick: () => copy("FullReport", resultToMarkdown(result)) },
  ];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            className={`text-[12px] px-2.5 py-1.5 rounded border transition-colors text-left ${
              b.primary
                ? "border-brand text-brand hover:bg-brand-soft"
                : "border-line text-ink-body hover:bg-section"
            }`}
          >
            {copied === b.key ? "✓ Copied" :
             copied === b.key + ":err" ? "Copy failed" :
             b.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center text-[12px]">
        <button
          type="button"
          onClick={nativeShare}
          className="px-2.5 py-1 border border-line rounded hover:bg-section text-ink-body"
        >
          Share…
        </button>
        <a
          href={intent("https://twitter.com/intent/tweet")}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 border border-line rounded hover:bg-section text-ink-body hover:no-underline"
        >
          X (Twitter)
        </a>
        <a
          href={intent("https://bsky.app/intent/compose")}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 border border-line rounded hover:bg-section text-ink-body hover:no-underline"
        >
          Bluesky
        </a>
      </div>

      <p className="text-[10.5px] text-ink-dim leading-relaxed">
        Posts include the locked verdict phrasing — never &ldquo;100% true/false.&rdquo;
      </p>
    </div>
  );
}

/** Build a ≤280-char social post with the locked phrasing. */
function buildSocialPost(verdict: string, input: string, score: number | null, href: string): string {
  const v = verdict.replace(/^[A-Z\s—]+:\s*/, ""); // drop the all-caps prefix
  const scorePart = score !== null ? ` · score ${score}/100` : "";
  const link = href ? ` ${href}` : "";
  // Conservative truncation: keep total ≤ 280
  const TARGET = 280 - link.length - scorePart.length - 24; // 24 for "Proofbase on \"\": " framing
  const trimmed = input.length > TARGET ? input.slice(0, Math.max(0, TARGET - 1)).trim() + "…" : input;
  return `Proofbase on "${trimmed}": ${v.toLowerCase()}${scorePart}.${link}`;
}
