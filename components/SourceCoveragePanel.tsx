"use client";

import type { CheckResult } from "@/lib/types";

interface Props {
  coverage: CheckResult["sourceCoverage"];
  coverageLevel: CheckResult["coverageLevel"];
  category: CheckResult["claimCategory"];
}

const STATUS_META: Record<CheckResult["sourceCoverage"][number]["status"], { label: string; dot: string; cls: string }> = {
  "ok":              { label: "returned results",   dot: "bg-verdict-green",  cls: "text-verdict-green" },
  "rate-limited":    { label: "rate limited",       dot: "bg-verdict-amber",  cls: "text-verdict-amber" },
  "error":           { label: "error",              dot: "bg-verdict-red",    cls: "text-verdict-red" },
  "blocked":         { label: "blocked",            dot: "bg-verdict-red",    cls: "text-verdict-red" },
  "no-key":          { label: "no API key set",     dot: "bg-ink-dim",        cls: "text-ink-dim" },
  "skipped":         { label: "skipped",            dot: "bg-ink-dim",        cls: "text-ink-dim" },
  "not-applicable":  { label: "not for this query", dot: "bg-ink-deep",       cls: "text-ink-deep" },
};

const COVERAGE_META: Record<CheckResult["coverageLevel"], { label: string; cls: string; desc: string }> = {
  high:   { label: "High coverage",   cls: "text-verdict-green bg-verdict-greenSoft", desc: "5+ adapters returned items. The evidence pool is broad." },
  medium: { label: "Medium coverage", cls: "text-verdict-amber bg-verdict-amberSoft", desc: "2-4 adapters returned items. Some corroboration available." },
  low:    { label: "Low coverage",    cls: "text-verdict-red   bg-verdict-redSoft",   desc: "Fewer than 2 adapters returned items. Treat the verdict cautiously." },
};

export default function SourceCoveragePanel({ coverage, coverageLevel, category }: Props) {
  if (coverage.length === 0) return null;

  const okCount        = coverage.filter((c) => c.status === "ok"           && c.itemCount > 0).length;
  const okEmptyCount   = coverage.filter((c) => c.status === "ok"           && c.itemCount === 0).length;
  const failCount      = coverage.filter((c) => c.status === "error" || c.status === "rate-limited" || c.status === "blocked").length;
  const skipCount      = coverage.filter((c) => c.status === "no-key" || c.status === "skipped").length;
  const naCount        = coverage.filter((c) => c.status === "not-applicable").length;
  const totalSearched  = coverage.length - naCount;
  const meta = COVERAGE_META[coverageLevel];
  const catLabel = category.replace(/-/g, " ");

  return (
    <div className="card p-3.5 space-y-3">
      {/* Top row */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Source coverage</div>
        <span className={`text-[12px] px-2 py-0.5 rounded font-medium ${meta.cls}`}>{meta.label}</span>
      </div>

      {/* Summary line */}
      <div className="text-[13px] text-ink-body leading-relaxed">
        <span>Searched <strong>{totalSearched}</strong> source{totalSearched === 1 ? "" : "s"} (routed for <em>{catLabel}</em> claims). </span>
        <span><strong className="text-verdict-green">{okCount}</strong> returned results</span>
        {okEmptyCount > 0 && <>, <strong>{okEmptyCount}</strong> returned empty</>}
        {failCount > 0 && <>, <strong className="text-verdict-red">{failCount}</strong> failed</>}
        {skipCount > 0 && <>, <strong className="text-ink-dim">{skipCount}</strong> skipped</>}
        {naCount > 0 && <> · <span className="text-ink-dim">{naCount} not applicable</span></>}
        <span>.</span>
      </div>
      <div className="text-[11.5px] text-ink-muted">{meta.desc}</div>

      {/* Per-adapter list */}
      <details className="text-[12.5px]">
        <summary className="text-link hover:underline">Per-source breakdown</summary>
        <ul className="mt-2 divide-y divide-line-soft border border-line rounded">
          {coverage.map((c) => {
            const m = STATUS_META[c.status];
            return (
              <li key={c.adapter} className="px-3 py-2 flex items-center gap-2 row-hover">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${m.dot} shrink-0`} aria-hidden="true" />
                <span className="text-ink-body w-40 truncate" title={c.adapter}>{c.name}</span>
                <span className={`text-[11px] ${m.cls} shrink-0`}>{m.label}</span>
                {c.requiresKey && (
                  <span className="text-[10px] text-ink-dim border border-line-soft rounded px-1 shrink-0">key</span>
                )}
                <span className="text-[11px] text-ink-muted ml-auto shrink-0">
                  {c.itemCount > 0 ? `${c.itemCount} item${c.itemCount === 1 ? "" : "s"}` : "—"}
                  {typeof c.durationMs === "number" && c.durationMs > 0 && (
                    <span className="text-ink-dim"> · {c.durationMs}ms</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="text-[11px] text-ink-dim mt-2">
          A source failing here never breaks the verdict — we transparently show every adapter we tried.
        </div>
      </details>
    </div>
  );
}
