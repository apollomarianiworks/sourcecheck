"use client";

import { useState } from "react";
import type { DebateBrief } from "@/lib/debate/brief";

export default function DebateTool() {
  const [topic, setTopic] = useState("universal basic income");
  const [brief, setBrief] = useState<DebateBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading || topic.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    try {
      const res = await fetch("/api/debate/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Debate brief failed.");
      setBrief(data as DebateBrief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-3.5 space-y-3">
        <label htmlFor="debate-topic" className="text-[12px] uppercase tracking-wide text-ink-muted">Debate topic</label>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            id="debate-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 px-3 py-2 text-[14px]"
            placeholder="e.g. nuclear energy, universal basic income, AI regulation"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || topic.trim().length < 3}
            className="bg-brand text-white hover:bg-brand-hover disabled:bg-section disabled:text-ink-dim px-4 py-2 rounded text-[14px] font-medium"
          >
            {loading ? "Building..." : "Build brief"}
          </button>
        </div>
        <p className="text-[12px] text-ink-muted">
          Debate Mode searches evidence for both sides. It does not invent arguments or pretend one side is proven.
        </p>
      </div>

      {error && <div className="card border-verdict-red/40 bg-verdict-redSoft p-3 text-[13px] text-verdict-red">{error}</div>}

      {brief && (
        <div className="space-y-4">
          <div className="card p-3.5">
            <div className="text-[11px] text-ink-muted uppercase tracking-wide">Brief uncertainty</div>
            <div className="text-[16px] font-bold text-ink">{brief.uncertainty}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Side title="Pro evidence packet" side={brief.pro} />
            <Side title="Con evidence packet" side={brief.con} />
            <Side title="Context packet" side={brief.neutralContext} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListCard title="Cross-examination questions" items={brief.crossExaminationQuestions} />
            <ListCard title="Fallacies to watch" items={brief.fallaciesToWatch} />
            <ListCard title="Missing evidence" items={brief.missingEvidence} />
            <ListCard title="Searches run" items={brief.searchesRun} />
          </div>
        </div>
      )}
    </div>
  );
}

function Side({ title, side }: { title: string; side: DebateBrief["pro"] }) {
  return (
    <section className="card p-3.5 space-y-3">
      <div>
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">{title}</div>
        <div className="text-[12px] text-ink-dim font-mono-tight">{side.query}</div>
      </div>
      {side.evidence.length === 0 ? (
        <div className="text-[13px] text-ink-muted">No evidence returned for this packet.</div>
      ) : (
        <ul className="space-y-2">
          {side.evidence.map((item) => (
            <li key={item.url} className="text-[12px] leading-snug">
              <a href={item.url} target="_blank" rel="noreferrer" className="text-link hover:underline">{item.title}</a>
              <div className="text-ink-dim">{item.publisher}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card p-3.5">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-[13px] text-ink-muted">None returned.</div>
      ) : (
        <ul className="space-y-1.5 text-[13px] text-ink-body list-disc pl-5">
          {items.slice(0, 10).map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}
