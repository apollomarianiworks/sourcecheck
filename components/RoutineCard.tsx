"use client";

import type { ProofbaseRoutine, RoutineRunResult } from "@/lib/routines/types";

export default function RoutineCard({ routine, result, onRun }: { routine: ProofbaseRoutine; result?: RoutineRunResult; onRun: (routine: ProofbaseRoutine) => void }) {
  return (
    <article className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">{routine.kind.replace(/-/g, " ")}</div>
          <h3 className="text-[16px] font-bold text-ink">{routine.title}</h3>
        </div>
        <span className="text-[11px] border border-line-soft rounded px-2 py-0.5 text-ink-muted">{routine.cadence}</span>
      </div>
      <p className="text-[13px] text-ink-body leading-relaxed">{routine.prompt}</p>
      <div className="flex flex-wrap gap-1.5">
        {routine.sourceTargets.map((source) => <span key={source} className="text-[11px] bg-section border border-line-soft rounded px-2 py-0.5">{source}</span>)}
      </div>
      <button type="button" onClick={() => onRun(routine)} className="text-[13px] bg-brand text-white hover:bg-brand-hover rounded px-3 py-2">
        Run manually
      </button>
      {result && (
        <div className="border-t border-line-soft pt-3 space-y-2">
          <div className="text-[13px] text-ink-body">{result.summary}</div>
          <div className="text-[12px] text-ink-muted">Next action: {result.nextRecommendedAction}</div>
          <ul className="space-y-1">
            {result.newEvidence.slice(0, 3).map((item) => (
              <li key={item.url} className="text-[12px]">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-link hover:underline">{item.publisher}: {item.title}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
