"use client";

import type { SourceMeshReport } from "@/lib/types";

interface Props {
  report: SourceMeshReport | undefined;
  onPick: (query: string) => void;
}

export default function AskFollowUpPanel({ report, onPick }: Props) {
  if (!report) return null;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-body leading-relaxed">
        Follow-up search is staged as a local UI flow for now. Pick one of the suggested searches to rerun SourceMesh with more targeted wording.
      </p>
      <div className="flex flex-wrap gap-2">
        {report.suggestedSearches.slice(0, 6).map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            className="text-[12px] px-2 py-1 rounded border border-line text-link hover:border-brand"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
