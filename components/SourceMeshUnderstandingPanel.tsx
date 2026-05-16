"use client";

import type { SourceMeshReport } from "@/lib/types";

interface Props {
  report: SourceMeshReport | undefined;
}

export default function SourceMeshUnderstandingPanel({ report }: Props) {
  if (!report) return null;
  const u = report.understanding;

  return (
    <div className="card p-3.5 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">What did we understand?</div>
        <span className="text-[12px] px-2 py-0.5 rounded bg-section text-ink-body">{u.inputType.replace(/-/g, " ")}</span>
      </div>

      <p className="text-[13px] text-ink-body leading-relaxed">
        I recognized this as <strong>{u.recognizedAs}</strong>.
        {u.convertedClaim && <> Search claim: <span className="font-mono-tight">{u.convertedClaim}</span>.</>}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
        <InfoList label="Entities" values={u.entities} empty="No strong entity detected." />
        <InfoList label="Categories" values={u.categories.map((c) => c.replace(/-/g, " "))} empty="General." />
        <InfoList label="Dates" values={u.hints.dates} empty="No date hint." />
        <InfoList label="Source targets" values={u.hints.sourceTargets} empty="Broad public sources." />
      </div>

      <div className="text-[11.5px] text-ink-muted">
        SourceMesh uses these signals to route sources and generate search variants. It does not use them as proof.
      </div>
    </div>
  );
}

function InfoList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="border border-line-soft rounded p-2 bg-section/40">
      <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">{label}</div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {values.slice(0, 8).map((value) => (
            <span key={value} className="px-1.5 py-0.5 rounded bg-page border border-line-soft text-ink-body">{value}</span>
          ))}
        </div>
      ) : (
        <div className="text-ink-dim">{empty}</div>
      )}
    </div>
  );
}
