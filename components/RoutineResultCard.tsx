"use client";

import type { RoutineRunResult } from "@/lib/routines/types";

export default function RoutineResultCard({ result }: { result: RoutineRunResult }) {
  return (
    <article className="card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Routine run</div>
          <h3 className="text-[18px] font-bold text-ink">{result.routineTitle}</h3>
          <div className="text-[12px] text-ink-muted">{new Date(result.ranAt).toLocaleString()} · {result.automationStatus}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-muted">Confidence</div>
          <div className="text-[13px] font-bold text-brand">{result.confidence}</div>
          {result.confidenceChanged && <div className="text-[11px] text-verdict-amber">Changed from previous run</div>}
        </div>
      </div>

      <p className="text-[13px] text-ink-body leading-relaxed">{result.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Evidence" value={String(result.evidenceUpdates.length)} />
        <Metric label="Sources searched" value={String(result.sourcesSearched.length)} />
        <Metric label="Open questions" value={String(result.unresolvedQuestions.length)} />
      </div>

      <Section title="Digest" items={result.digest} />
      <EvidenceSection title="Strongest evidence" items={result.strongestEvidence} />
      <EvidenceSection title="Weakest evidence" items={result.weakestEvidence} />
      <Section title="Unresolved questions" items={result.unresolvedQuestions} />
      <Section title="Suggested follow-up searches" items={result.suggestedFollowups} />

      <details className="text-[12px]">
        <summary className="text-link hover:underline">Sources searched</summary>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {result.sourcesSearched.map((source) => <li key={source} className="border border-line-soft rounded px-2 py-1 text-ink-muted">{source}</li>)}
        </ul>
      </details>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-soft bg-section rounded p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-[22px] font-bold text-ink">{value}</div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="text-[12px] uppercase tracking-wide text-ink-muted mb-2">{title}</div>
      <ul className="list-disc pl-5 text-[13px] text-ink-body space-y-1">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function EvidenceSection({ title, items }: { title: string; items: RoutineRunResult["strongestEvidence"] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="text-[12px] uppercase tracking-wide text-ink-muted mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.url} className="border border-line-soft rounded p-2">
            <a href={item.url} target="_blank" rel="noreferrer" className="text-[13px] text-link hover:underline font-medium">{item.publisher}: {item.title}</a>
            <p className="text-[12px] text-ink-muted mt-1 line-clamp-2">{item.snippet}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
