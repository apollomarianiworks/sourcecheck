"use client";

import { useMemo, useState } from "react";
import { scoreDomain } from "@/lib/domain-scorer";
import { CATEGORY_META } from "@/lib/categories";
import { describeFlag } from "@/lib/source-rules";
import type { DomainAnalysis } from "@/lib/types";

const SUGGESTIONS = [
  "reuters.com", "apnews.com", "bbc.com", "npr.org",
  "cnn.com", "foxnews.com", "nytimes.com", "wsj.com",
  "snopes.com", "politifact.com", "wikipedia.org",
  "cdc.gov", "nih.gov", "census.gov", "supremecourt.gov",
];

function cleanDomain(s: string): string {
  return s.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[\/?#]/)[0];
}

export default function CompareTool() {
  const [a, setA] = useState("reuters.com");
  const [b, setB] = useState("foxnews.com");

  const A = useMemo(() => scoreDomain(cleanDomain(a)), [a]);
  const B = useMemo(() => scoreDomain(cleanDomain(b)), [b]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DomainInput label="Source A" value={a} onChange={setA} />
        <DomainInput label="Source B" value={b} onChange={setB} />
      </div>

      {/* Quick picks */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Quick picks</div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => (a === s ? setB(s) : setA(s))}
              className="text-[12px] px-2 py-1 rounded border border-line bg-chip hover:bg-section hover:border-ink-dim transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonCard analysis={A} />
        <ComparisonCard analysis={B} />
      </div>

      {/* Disclaimer */}
      <div className="text-[12px] text-ink-muted bg-section border border-line-soft rounded p-3 leading-relaxed">
        <strong className="text-ink-body">A reminder:</strong> these scores describe the publisher&apos;s editorial track record,
        not whether any specific story from that publisher is correct. Use the comparison as one input — read the source itself before relying on it.
      </div>
    </div>
  );
}

function DomainInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-ink-muted uppercase tracking-wide">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. reuters.com"
        className="w-full px-3 py-2 border border-line rounded bg-page text-[15px] focus:border-brand"
      />
    </label>
  );
}

function ComparisonCard({ analysis }: { analysis: DomainAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="card p-4 text-[13px] text-ink-dim">
        Enter a domain to compare.
      </div>
    );
  }
  const cat = CATEGORY_META[analysis.category];
  const scoreText =
    analysis.finalScore >= 70 ? "text-verdict-green" :
    analysis.finalScore >= 50 ? "text-verdict-amber" :
                                "text-verdict-red";

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-[16px] font-bold text-ink truncate">{analysis.domain}</h3>
        <span className={`text-[22px] font-bold ${scoreText}`}>{analysis.finalScore}<span className="text-ink-dim text-[12px]">/100</span></span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-section text-ink-body">
          {cat.label}{analysis.categoryInferred ? " (inferred)" : ""}
        </span>
        {analysis.tier !== "?" && (
          <span className="text-[11px] px-1.5 py-0.5 rounded border border-line text-ink-muted">
            Tier {analysis.tier}
          </span>
        )}
        {analysis.tldBonus !== 0 && (
          <span className="text-[11px] text-ink-dim">
            TLD adj: {analysis.tldBonus > 0 ? "+" : ""}{analysis.tldBonus}
          </span>
        )}
      </div>

      <p className="text-[13px] text-ink-body leading-relaxed">{analysis.notes}</p>

      {analysis.preferredUse && (
        <div className="bg-soft border-l-2 border-line rounded-sm p-2">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Best used for</div>
          <div className="text-[12.5px] text-ink-body mt-0.5">{analysis.preferredUse}</div>
        </div>
      )}

      {analysis.warningFlags.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Flags</div>
          <div className="flex flex-wrap gap-1">
            {analysis.warningFlags.map((f) => {
              const meta = describeFlag(f);
              const cls =
                meta.tone === "good"    ? "bg-verdict-greenSoft text-verdict-green" :
                meta.tone === "bad"     ? "bg-verdict-redSoft text-verdict-red" :
                meta.tone === "warn"    ? "bg-verdict-amberSoft text-verdict-amber" :
                                          "bg-section text-ink-muted";
              return (
                <span key={f} className={`text-[10.5px] px-1.5 py-0.5 rounded ${cls}`} title={f}>
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
