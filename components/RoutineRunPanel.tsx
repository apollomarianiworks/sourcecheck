"use client";

import { useState } from "react";
import RoutineResultCard from "./RoutineResultCard";
import type { ProofbaseRoutine, RoutineRunResult } from "@/lib/routines/types";
import { latestRunFor, saveRoutineRun } from "@/lib/routines/storage";

export default function RoutineRunPanel({ routine, onRunSaved }: { routine: ProofbaseRoutine; onRunSaved?: (run: RoutineRunResult) => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutineRunResult | null>(latestRunFor(routine.id));

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const previous = latestRunFor(routine.id);
      const res = await fetch("/api/routines/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routine, previousConfidence: previous?.confidence ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Routine failed.");
      const runResult = json as RoutineRunResult;
      saveRoutineRun(runResult);
      setResult(runResult);
      onRunSaved?.(runResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routine failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Manual run</div>
            <h2 className="text-[20px] font-bold text-ink">Run this routine now</h2>
          </div>
          <span className="text-[11px] border border-line-soft rounded px-2 py-0.5 text-ink-muted">{routine.schedule.provider}</span>
        </div>
        <p className="text-[13px] text-ink-body">{routine.schedule.note}</p>
        <button type="button" onClick={run} disabled={running} className="bg-brand text-white rounded px-3 py-2 text-[13px] disabled:opacity-50">
          {running ? "Running evidence scan..." : "Run manually"}
        </button>
        {error && <div className="text-[12px] text-verdict-red">{error}</div>}
      </section>

      {result && <RoutineResultCard result={result} />}
    </div>
  );
}
