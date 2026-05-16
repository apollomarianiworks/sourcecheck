"use client";

import { useMemo, useState } from "react";

export default function DebateTimer({ minutes = 4 }: { minutes?: number }) {
  const [running, setRunning] = useState(false);
  const label = useMemo(() => `${minutes}:00`, [minutes]);
  return (
    <div className="rounded border border-line-soft bg-section p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">Manual debate timer</div>
      <div className="text-[28px] font-bold text-ink tabular-nums">{label}</div>
      <button type="button" onClick={() => setRunning((v) => !v)} className="text-[12px] rounded border border-line px-2 py-1 hover:bg-page">
        {running ? "Pause placeholder" : "Start placeholder"}
      </button>
    </div>
  );
}
