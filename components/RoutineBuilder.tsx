"use client";

import { useEffect, useState } from "react";
import RoutineCard from "./RoutineCard";
import { ROUTINE_TEMPLATES, createRoutineFromTemplate } from "@/lib/routines/templates";
import type { ProofbaseRoutine, RoutineKind, RoutineRunResult } from "@/lib/routines/types";
import { getStorageProvider } from "@/lib/storage/provider";

export default function RoutineBuilder() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<RoutineKind>("monitor-topic");
  const [routines, setRoutines] = useState<ProofbaseRoutine[]>([]);
  const [runs, setRuns] = useState<Record<string, RoutineRunResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    const store = getStorageProvider();
    setRoutines(store.listRoutines());
    setRuns(Object.fromEntries(store.listRoutineRuns().map((run) => [run.routineId, run])));
  }, []);

  function addRoutine() {
    const routine = createRoutineFromTemplate(kind, topic.trim());
    const store = getStorageProvider();
    store.saveRoutine(routine);
    setRoutines(store.listRoutines());
    setTopic("");
  }

  async function run(routine: ProofbaseRoutine) {
    setRunningId(routine.id);
    try {
      const res = await fetch("/api/routines/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routine }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Routine failed.");
      const result = json as RoutineRunResult;
      const store = getStorageProvider();
      store.saveRoutineRun(result);
      setRuns((current) => ({ ...current, [routine.id]: result }));
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Routine builder</div>
          <h2 className="text-[20px] font-bold text-ink">Saved workflows, manual runs for now</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_auto] gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as RoutineKind)} className="border border-line rounded px-2 py-2 bg-page text-[13px]">
            {ROUTINE_TEMPLATES.map((template) => <option key={template.kind} value={template.kind}>{template.title}</option>)}
          </select>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className="border border-line rounded px-2 py-2 bg-page text-[13px]" placeholder="Topic, source, or claim to watch" />
          <button type="button" onClick={addRoutine} className="bg-brand text-white rounded px-3 py-2 text-[13px]">Save routine</button>
        </div>
        <p className="text-[12px] text-ink-muted">No hidden jobs are created. These are exportable workflows, ready for future Vercel Cron, Firebase scheduled functions, or Cloudflare Cron.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routines.length > 0 ? routines.map((routine) => (
          <div key={routine.id} className={runningId === routine.id ? "opacity-70" : ""}>
            <RoutineCard routine={routine} result={runs[routine.id]} onRun={run} />
          </div>
        )) : ROUTINE_TEMPLATES.slice(0, 4).map((template) => (
          <div key={template.kind} className="card p-4">
            <div className="text-[15px] font-bold text-ink">{template.title}</div>
            <p className="text-[13px] text-ink-muted mt-1">{template.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
