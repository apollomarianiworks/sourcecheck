"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoutineRunPanel from "@/components/RoutineRunPanel";
import RoutineResultCard from "@/components/RoutineResultCard";
import type { ProofbaseRoutine, RoutineRunResult } from "@/lib/routines/types";
import { duplicateRoutine, getRoutine, listRoutineRuns, routineShareDraft, saveRoutine } from "@/lib/routines/storage";

export default function RoutineDetailClient({ routineId }: { routineId: string }) {
  const [routine, setRoutine] = useState<ProofbaseRoutine | null>(null);
  const [runs, setRuns] = useState<RoutineRunResult[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProofbaseRoutine | null>(null);

  useEffect(() => refresh(), [routineId]);

  function refresh() {
    const found = getRoutine(routineId);
    setRoutine(found);
    setDraft(found);
    setRuns(listRoutineRuns(routineId));
  }

  function saveDraft() {
    if (!draft) return;
    saveRoutine({
      ...draft,
      querySeeds: draft.querySeeds.map((seed) => seed.trim()).filter(Boolean),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
    });
    setEditing(false);
    refresh();
  }

  function duplicate() {
    if (!routine) return;
    duplicateRoutine(routine);
    refresh();
  }

  if (!routine) {
    return (
      <main className="max-w-page mx-auto px-4 md:px-6 py-8 space-y-4">
        <Link href="/routines" className="text-link hover:underline">Back to routines</Link>
        <div className="card p-5 text-[13px] text-ink-muted">Routine not found in local storage.</div>
      </main>
    );
  }

  const share = routineShareDraft(routine);

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/routines" className="text-link hover:underline text-[13px]">Back to routines</Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section">
            {editing ? "Cancel edit" : "Edit"}
          </button>
          <button type="button" onClick={duplicate} className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section">
            Duplicate
          </button>
        </div>
      </div>

      <section className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-ink-muted">{routine.kind.replace(/-/g, " ")}</div>
            <h1 className="text-[30px] font-bold text-ink leading-tight">{routine.title}</h1>
            <p className="text-[14px] text-ink-body mt-2 max-w-3xl">{routine.description}</p>
          </div>
          <span className="text-[12px] border border-line-soft rounded px-2 py-1 text-ink-muted">{routine.visibility}</span>
        </div>

        {editing && draft ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-line-soft pt-4">
            <label className="space-y-1">
              <span className="text-[12px] text-ink-muted">Title</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full border border-line rounded px-2 py-2 text-[13px]" />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] text-ink-muted">Tags, comma-separated</span>
              <input value={draft.tags.join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",") })} className="w-full border border-line rounded px-2 py-2 text-[13px]" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[12px] text-ink-muted">Prompt</span>
              <textarea value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} rows={3} className="w-full border border-line rounded px-2 py-2 text-[13px]" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[12px] text-ink-muted">Query seeds, one per line</span>
              <textarea value={draft.querySeeds.join("\n")} onChange={(e) => setDraft({ ...draft, querySeeds: e.target.value.split("\n") })} rows={5} className="w-full border border-line rounded px-2 py-2 text-[13px]" />
            </label>
            <button type="button" onClick={saveDraft} className="bg-brand text-white rounded px-3 py-2 text-[13px] md:w-fit">Save changes</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-line-soft pt-4">
            <Info label="Query seeds" value={String(routine.querySeeds.length)} />
            <Info label="Source targets" value={String(routine.sourceTargets.length)} />
            <Info label="Last run" value={routine.lastRunAt ? new Date(routine.lastRunAt).toLocaleString() : "Never"} />
          </div>
        )}

        <details className="text-[12px]">
          <summary className="text-link hover:underline">Share/clone draft metadata</summary>
          <pre className="mt-2 bg-section border border-line-soft rounded p-3 overflow-auto text-[11px]">{JSON.stringify(share, null, 2)}</pre>
        </details>
      </section>

      <RoutineRunPanel routine={routine} onRunSaved={refresh} />

      <section className="space-y-3">
        <h2 className="text-[20px] font-bold text-ink">Run history</h2>
        {runs.length > 0 ? runs.map((run) => <RoutineResultCard key={run.id} result={run} />) : (
          <div className="card p-5 text-[13px] text-ink-muted">No runs yet. Run the routine manually to generate evidence updates.</div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-soft rounded p-3 bg-section">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-[14px] font-bold text-ink">{value}</div>
    </div>
  );
}
