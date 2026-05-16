"use client";

import type { CheckResult } from "@/lib/types";

const TONE: Record<CheckResult["safetyWarnings"][number]["tone"], { box: string; icon: string; cls: string }> = {
  warn:    { box: "bg-verdict-amberSoft border-verdict-amber/40", icon: "⚠", cls: "text-verdict-amber" },
  bad:     { box: "bg-verdict-redSoft border-verdict-red/40",     icon: "✗", cls: "text-verdict-red" },
  neutral: { box: "bg-section border-line",                       icon: "ℹ", cls: "text-ink-muted" },
};

interface Props { warnings: CheckResult["safetyWarnings"]; }

export default function SafetyWarningsPanel({ warnings }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className="card p-3.5 space-y-2">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">
        Safety notes ({warnings.length})
      </div>
      <ul className="space-y-1.5">
        {warnings.map((w, i) => {
          const t = TONE[w.tone];
          return (
            <li key={i} className={`border rounded ${t.box} px-2.5 py-1.5 flex items-start gap-2`}>
              <span className={`shrink-0 ${t.cls}`} aria-hidden="true">{t.icon}</span>
              <span className="text-[12.5px] text-ink-body leading-relaxed">{w.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
