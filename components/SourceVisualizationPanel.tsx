import type { CheckResult } from "@/lib/types";

export default function SourceVisualizationPanel({ result }: { result: CheckResult }) {
  const domains = Array.from(new Set(result.evidence.map((item) => item.domain).filter(Boolean))).slice(0, 8);
  const sourceTypes = Array.from(new Set(result.evidence.map((item) => item.source)));

  return (
    <section className="card p-3.5 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Source visualization</div>
        <h3 className="text-[15px] font-bold text-ink">How sources connect</h3>
      </div>
      {result.evidence.length === 0 ? (
        <p className="text-[13px] text-ink-muted">No evidence graph can be drawn until real sources are returned.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <div className="rounded border border-line-soft bg-soft p-3">
            <div className="flex flex-wrap items-center gap-2">
              {domains.map((domain, index) => (
                <div key={domain} className="flex items-center gap-2">
                  {index > 0 && <span className="h-px w-6 bg-line" aria-hidden="true" />}
                  <span className="rounded-full border border-line bg-page px-2 py-1 text-[11px] text-ink-muted">{domain}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {sourceTypes.map((source) => (
              <div key={source} className="rounded border border-line-soft bg-page px-2 py-1 text-[12px] text-ink-muted">
                {source}: {result.evidence.filter((item) => item.source === source).length}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
