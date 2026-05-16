"use client";

import type { CheckResult } from "@/lib/types";

function levelStyle(level: CheckResult["confidence"]["level"]): { text: string; bar: string } {
  switch (level) {
    case "high":         return { text: "text-verdict-green", bar: "bg-verdict-green" };
    case "medium":       return { text: "text-link",          bar: "bg-link" };
    case "low":          return { text: "text-verdict-amber", bar: "bg-verdict-amber" };
    case "insufficient": return { text: "text-verdict-red",   bar: "bg-verdict-red" };
  }
}

interface Props { confidence: CheckResult["confidence"]; }

export default function ConfidencePanel({ confidence }: Props) {
  const s = levelStyle(confidence.level);
  return (
    <div className="card p-3.5 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Verdict confidence</div>
        <span className={`text-[14px] font-bold ${s.text}`}>
          {confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)}
          <span className="text-ink-dim font-normal text-[12px]"> · {confidence.score}/100</span>
        </span>
      </div>
      <div className="w-full bg-section h-1.5 rounded-sm overflow-hidden">
        <div
          className={`h-full ${s.bar} score-bar-fill rounded-sm`}
          style={{ "--target-width": `${confidence.score}%` } as React.CSSProperties}
        />
      </div>
      <p className="text-[13px] text-ink-body leading-relaxed">{confidence.rationale}</p>

      {confidence.factors.length > 0 && (
        <details className="text-[12.5px]">
          <summary className="text-link hover:underline">
            Why this confidence? ({confidence.factors.length} factor{confidence.factors.length !== 1 ? "s" : ""})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {confidence.factors.map((f, i) => {
              const sign = f.delta > 0 ? "+" : "";
              const c =
                f.delta > 0 ? "text-verdict-green" :
                f.delta < 0 ? "text-verdict-red" :
                              "text-ink-muted";
              return (
                <li key={i} className="flex gap-2">
                  <span className={`${c} font-mono-tight shrink-0 w-10 text-right`}>
                    {f.delta === 0 ? "·" : `${sign}${f.delta}`}
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className="text-ink-body">{f.label}</div>
                    <div className="text-ink-muted text-[11px]">{f.detail}</div>
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div className="text-[11px] text-ink-dim border-t border-line-soft pt-1.5">
        Confidence reflects how strong the EVIDENCE is — not the probability that the claim is true.
      </div>
    </div>
  );
}
