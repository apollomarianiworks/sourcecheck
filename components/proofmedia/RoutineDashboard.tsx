"use client";

import { useEffect, useState } from "react";
import { ROUTINE_TEMPLATES } from "@/lib/routines/templates";
import { latestRunFor, listRoutines } from "@/lib/routines/storage";
import type { ProofbaseRoutine } from "@/lib/routines/types";

export default function RoutineDashboard() {
  const [routines, setRoutines] = useState<ProofbaseRoutine[]>([]);
  useEffect(() => setRoutines(listRoutines()), []);
  const runs = routines.map((routine) => latestRunFor(routine.id)).filter(Boolean);
  const favorites = routines.filter((routine) => /daily|watch|monitor|digest/i.test(`${routine.title} ${routine.kind}`));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Routine dashboard</div>
          <h2 className="text-[22px] font-bold text-ink">Daily intelligence without fake monitoring</h2>
          <p className="text-[13px] text-ink-muted">Manual routines today; future premium routines can add scheduled digests, team workspaces, and advanced exports.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Saved" value={routines.length} />
          <Metric label="Run history" value={runs.length} />
          <Metric label="Favorites" value={favorites.length} />
          <Metric label="Community" value="planned" />
        </div>
      </div>
      <aside className="card p-4 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Library</div>
        {ROUTINE_TEMPLATES.slice(0, 6).map((template) => (
          <div key={template.kind} className="rounded border border-line-soft bg-soft p-2">
            <div className="text-[13px] font-bold text-ink">{template.title}</div>
            <div className="text-[11.5px] text-ink-muted">{template.kind.replace(/-/g, " ")}</div>
          </div>
        ))}
      </aside>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-line-soft bg-soft p-3">
      <div className="text-[20px] font-bold text-ink">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}
