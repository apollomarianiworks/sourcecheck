"use client";

import type { ClaimLabel } from "@/lib/types";

interface Props {
  labels: ClaimLabel[];
  missing: { id: string; text: string }[];
}

const TONE: Record<ClaimLabel["tone"], { cls: string; icon: string }> = {
  good:    { cls: "bg-verdict-greenSoft text-verdict-green border-verdict-green/40", icon: "✓" },
  warn:    { cls: "bg-verdict-amberSoft text-verdict-amber border-verdict-amber/40", icon: "◐" },
  bad:     { cls: "bg-verdict-redSoft text-verdict-red border-verdict-red/40",       icon: "✗" },
  neutral: { cls: "bg-section text-ink-body border-line",                            icon: "•" },
};

export default function ClaimLabelsPanel({ labels, missing }: Props) {
  if (labels.length === 0 && missing.length === 0) return null;
  return (
    <div className="card p-3.5 space-y-2.5">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Claim labels</div>

      {labels.length > 0 ? (
        <ul className="space-y-1.5">
          {labels.map((l) => {
            const t = TONE[l.tone];
            return (
              <li key={l.id} className={`border rounded ${t.cls} px-2.5 py-1.5 flex items-start gap-2`}>
                <span className="shrink-0 text-[14px] leading-none mt-0.5" aria-hidden="true">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{l.text}</div>
                  {l.detail && <div className="text-[11.5px] opacity-80 mt-0.5 leading-snug">{l.detail}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-[12px] text-ink-muted">No qualifying labels.</div>
      )}

      {missing.length > 0 && (
        <div className="border-t border-line-soft pt-2 space-y-1">
          <div className="text-[10.5px] uppercase tracking-wide text-verdict-amber">Missing signals</div>
          <ul className="text-[12px] text-ink-body space-y-1">
            {missing.map((m) => <li key={m.id} className="leading-snug">· {m.text}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
