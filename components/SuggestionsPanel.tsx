"use client";

import type { CheckResult } from "@/lib/types";

const PRIORITY: Record<CheckResult["suggestions"][number]["priority"], { cls: string; label: string }> = {
  high:   { cls: "bg-verdict-amberSoft text-verdict-amber", label: "High" },
  medium: { cls: "bg-section text-link",                    label: "Medium" },
  low:    { cls: "bg-section text-ink-muted",               label: "Low" },
};

interface Props { suggestions: CheckResult["suggestions"]; }

export default function SuggestionsPanel({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return <div className="text-[13px] text-ink-muted">No improvement suggestions for this check.</div>;
  }
  return (
    <ul className="space-y-2">
      {suggestions.map((s) => {
        const p = PRIORITY[s.priority];
        return (
          <li key={s.id} className="flex items-start gap-2 text-[13px]">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium ${p.cls}`}>{p.label}</span>
            <span className="text-ink-body leading-relaxed flex-1">{s.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
