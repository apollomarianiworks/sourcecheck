"use client";

import Link from "next/link";
import type { ProofbaseRoutine, RoutineRunResult } from "@/lib/routines/types";

export default function RoutineCard({
  routine,
  result,
  onRun,
  onDuplicate,
  onDelete,
}: {
  routine: ProofbaseRoutine;
  result?: RoutineRunResult | null;
  onRun: (routine: ProofbaseRoutine) => void;
  onDuplicate?: (routine: ProofbaseRoutine) => void;
  onDelete?: (routine: ProofbaseRoutine) => void;
}) {
  return (
    <article className="card p-4 space-y-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">{routine.kind.replace(/-/g, " ")}</div>
          <h3 className="text-[16px] font-bold text-ink leading-snug">{routine.title}</h3>
        </div>
        <span className="text-[11px] border border-line-soft rounded px-2 py-0.5 text-ink-muted shrink-0">{routine.cadence}</span>
      </div>

      <p className="text-[13px] text-ink-body leading-relaxed">{routine.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {routine.tags.slice(0, 4).map((tag) => <span key={tag} className="text-[11px] bg-section border border-line-soft rounded px-2 py-0.5">{tag}</span>)}
      </div>

      <div className="text-[12px] text-ink-muted">
        {routine.querySeeds.length} query seed{routine.querySeeds.length === 1 ? "" : "s"} · {routine.sourceTargets.length} source target{routine.sourceTargets.length === 1 ? "" : "s"}
      </div>

      {result && (
        <div className="border border-line-soft bg-section rounded p-2 space-y-1">
          <div className="text-[12px] text-ink-body">{result.summary}</div>
          <div className="text-[11px] text-ink-muted">Last run: {new Date(result.ranAt).toLocaleString()}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => onRun(routine)} className="text-[13px] bg-brand text-white hover:bg-brand-hover rounded px-3 py-2">
          Run manually
        </button>
        <Link href={`/routines/${encodeURIComponent(routine.id)}`} className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section hover:no-underline">
          Open
        </Link>
        {onDuplicate && (
          <button type="button" onClick={() => onDuplicate(routine)} className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section">
            Duplicate
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(routine)} className="text-[13px] text-verdict-red border border-verdict-red/30 rounded px-3 py-2 hover:bg-verdict-redSoft">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
