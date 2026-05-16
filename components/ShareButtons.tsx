"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { verdictLabel } from "@/lib/scoring";

interface Props { result: CheckResult; }

function buildShareText(result: CheckResult): string {
  const label = verdictLabel(result.evidenceVerdict);
  const score = result.sourceQualityScore !== null ? `· source-quality ${result.sourceQualityScore}/100 ` : "";
  return `SourceCheck on "${result.input}": ${label} ${score}— see the evidence at`;
}

export default function ShareButtons({ result }: Props) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    const text = buildShareText(result) + " " + (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (navigator.share) {
        await navigator.share({ title: "SourceCheck result", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* user cancelled or no clipboard */ }
  }

  function intent(prefix: string) {
    const text = encodeURIComponent(buildShareText(result));
    const url  = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "");
    return `${prefix}?text=${text}&url=${url}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={copySummary}
        className="text-[12px] px-2.5 py-1 border border-line rounded hover:bg-section transition-colors"
      >
        {copied ? "✓ Copied" : "Share / Copy summary"}
      </button>
      <a
        href={intent("https://twitter.com/intent/tweet")}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] px-2.5 py-1 border border-line rounded hover:bg-section text-ink-body hover:no-underline"
      >
        X (Twitter)
      </a>
      <a
        href={intent("https://bsky.app/intent/compose")}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] px-2.5 py-1 border border-line rounded hover:bg-section text-ink-body hover:no-underline"
      >
        Bluesky
      </a>
    </div>
  );
}
