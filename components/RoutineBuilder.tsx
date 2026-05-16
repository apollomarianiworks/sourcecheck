"use client";

import { useEffect, useMemo, useState } from "react";
import RoutineCard from "./RoutineCard";
import RoutineRunPanel from "./RoutineRunPanel";
import { ROUTINE_TEMPLATES, createRoutineFromTemplate } from "@/lib/routines/templates";
import type { ProofbaseRoutine, RoutineKind, RoutineRunResult } from "@/lib/routines/types";
import { deleteRoutine, duplicateRoutine, latestRunFor, listRoutines, saveRoutine } from "@/lib/routines/storage";

const KIND_OPTIONS = ROUTINE_TEMPLATES.map((template) => ({ value: template.kind, label: template.title }));

export default function RoutineBuilder() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<RoutineKind>("topic-watch");
  const [routines, setRoutines] = useState<ProofbaseRoutine[]>([]);
  const [filter, setFilter] = useState<RoutineKind | "all">("all");
  const [activeRun, setActiveRun] = useState<ProofbaseRoutine | null>(null);
  const [latestRuns, setLatestRuns] = useState<Record<string, RoutineRunResult | null>>({});

  useEffect(() => refresh(), []);

  const filtered = useMemo(() => routines.filter((routine) => filter === "all" || routine.kind === filter), [routines, filter]);

  function refresh() {
    const next = listRoutines();
    setRoutines(next);
    setLatestRuns(Object.fromEntries(next.map((routine) => [routine.id, latestRunFor(routine.id)])));
  }

  function addRoutine() {
    const routine = createRoutineFromTemplate(kind, topic.trim());
    saveRoutine(routine);
    setTopic("");
    refresh();
  }

  function duplicate(routine: ProofbaseRoutine) {
    duplicateRoutine(routine);
    refresh();
  }

  function remove(routine: ProofbaseRoutine) {
    deleteRoutine(routine.id);
    if (activeRun?.id === routine.id) setActiveRun(null);
    refresh();
  }

  function quickSaveTemplate(templateKind: RoutineKind) {
    saveRoutine(createRoutineFromTemplate(templateKind, ""));
    refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="card p-4 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Routine builder</div>
            <h2 className="text-[22px] font-bold text-ink">Reusable evidence workflows</h2>
            <p className="text-[13px] text-ink-muted mt-1">Create repeatable scans for topics, debates, sources, social narratives, digests, and context monitoring.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_auto] gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as RoutineKind)} className="border border-line rounded px-2 py-2 bg-page text-[13px]">
              {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className="border border-line rounded px-2 py-2 bg-page text-[13px]" placeholder="Topic, source, claim, debate, or collection" />
            <button type="button" onClick={addRoutine} className="bg-brand text-white rounded px-3 py-2 text-[13px]">Create routine</button>
          </div>
          <p className="text-[12px] text-ink-muted">Manual only today. No hidden background jobs, no fake monitoring, no private social scraping.</p>
        </div>

        <div className="card p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Organize</div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as RoutineKind | "all")} className="w-full border border-line rounded px-2 py-2 bg-page text-[13px]">
            <option value="all">All routines</option>
            {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="Saved" value={routines.length} />
            <Metric label="Run" value={Object.values(latestRuns).filter(Boolean).length} />
          </div>
        </div>
      </section>

      {activeRun && <RoutineRunPanel routine={activeRun} onRunSaved={refresh} />}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[18px] font-bold text-ink">Your routines</h2>
          <span className="text-[12px] text-ink-muted">{filtered.length} shown</span>
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                result={latestRuns[routine.id] ?? null}
                onRun={setActiveRun}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ROUTINE_TEMPLATES.map((template) => (
              <div key={template.kind} className="card p-4 space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">{template.kind.replace(/-/g, " ")}</div>
                  <h3 className="text-[16px] font-bold text-ink">{template.title}</h3>
                </div>
                <p className="text-[13px] text-ink-muted">{template.description}</p>
                <button type="button" onClick={() => quickSaveTemplate(template.kind)} className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section">
                  Save template
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line-soft rounded p-2 bg-section">
      <div className="text-[20px] font-bold text-ink">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}
