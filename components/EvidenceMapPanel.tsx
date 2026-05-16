"use client";

import type { SourceMeshReport } from "@/lib/types";

interface Props {
  report: SourceMeshReport | undefined;
}

export default function EvidenceMapPanel({ report }: Props) {
  if (!report) return null;
  const map = report.evidenceMap;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <EvidenceColumn title="Strongest evidence" items={map.strongest} empty="No strong evidence returned." />
        <EvidenceColumn title="Weakest evidence" items={map.weakest} empty="No weaker evidence to compare." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
        <div className="border border-line-soft rounded p-2">
          <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">By source</div>
          {map.bySource.length === 0 ? (
            <div className="text-ink-dim">No source clusters.</div>
          ) : (
            <ul className="space-y-1">
              {map.bySource.slice(0, 8).map((row) => (
                <li key={row.source} className="flex items-center gap-2">
                  <span className="text-ink-body truncate flex-1">{row.source}</span>
                  <span className="text-ink-muted">{row.quality}</span>
                  <span className="text-ink-dim">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-line-soft rounded p-2">
          <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">By stance</div>
          {map.byStance.length === 0 ? (
            <div className="text-ink-dim">No stance signals.</div>
          ) : (
            <ul className="space-y-1">
              {map.byStance.map((row) => (
                <li key={row.stance} className="flex items-center justify-between gap-2">
                  <span className="text-ink-body">{row.stance}</span>
                  <span className="text-ink-dim">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceColumn({ title, items, empty }: { title: string; items: SourceMeshReport["evidenceMap"]["strongest"]; empty: string }) {
  return (
    <div className="border border-line-soft rounded p-2">
      <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-[12px] text-ink-dim">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.url} className="text-[12px] leading-snug">
              <a href={item.url} target="_blank" rel="noreferrer" className="text-link hover:underline">{item.title}</a>
              <div className="text-ink-dim">{item.publisher} - {item.relevance}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
