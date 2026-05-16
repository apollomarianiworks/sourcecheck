"use client";

import type { SourceMeshReport } from "@/lib/types";

export default function SearchPlanPanel({ report }: { report?: SourceMeshReport }) {
  if (!report?.searchPlan) return null;
  const plan = report.searchPlan;
  return (
    <div className="card p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Search plan</div>
        <span className="text-[12px] px-2 py-0.5 bg-section rounded text-ink-muted">{plan.searchIntent}</span>
      </div>
      <div className="text-[13px] text-ink-body">
        Interpreted as <strong>{plan.interpretedQuery}</strong> across <em>{plan.detectedCategory}</em>.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
        <Block title="Why these sources" items={plan.whyTheseSources} />
        <Block title="Selected adapters" items={plan.selectedAdapters.slice(0, 10)} />
        <Block title="Skipped sources" items={plan.skippedSources.slice(0, 8)} empty="No skipped sources." />
        <Block title="Failed sources" items={plan.failedSources.slice(0, 8)} empty="No failures reported." />
      </div>
      {plan.topicMemory.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.topicMemory.map((item) => <span key={item} className="text-[11px] border border-line-soft rounded px-2 py-0.5 text-ink-muted">{item}</span>)}
        </div>
      )}
    </div>
  );
}

function Block({ title, items, empty = "None." }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="bg-section border border-line-soft rounded p-2">
      <div className="font-bold text-ink mb-1">{title}</div>
      {items.length > 0 ? (
        <ul className="list-disc pl-4 space-y-0.5 text-ink-body">{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <div className="text-ink-dim">{empty}</div>
      )}
    </div>
  );
}
