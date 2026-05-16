"use client";

import type { ReputationSnapshot } from "@/lib/proofmedia/reputation";

export default function ReputationPanel({ snapshot }: { snapshot: ReputationSnapshot }) {
  const stats = [
    ["Evidence", snapshot.metrics.evidenceContributions],
    ["Context", snapshot.metrics.contextNotesAdded],
    ["Debates", snapshot.metrics.debatesParticipated],
    ["Sources", snapshot.metrics.sourcesCited],
    ["Collections", snapshot.metrics.collectionsCreated],
    ["Quality avg", snapshot.metrics.sourceQualityAverage],
  ];

  return (
    <section className="card overflow-hidden">
      <div className="h-20 bg-[linear-gradient(135deg,#1a1a1a,#cc0000)]" aria-hidden="true" />
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Evidence reputation</div>
            <h2 className="text-[20px] font-bold text-ink">{snapshot.level}</h2>
            <p className="text-[12.5px] text-ink-muted">Reputation is based on evidence work, not follower counts.</p>
          </div>
          <div className="rounded border border-line bg-soft px-3 py-2 text-center">
            <div className="text-[22px] font-bold text-ink">{snapshot.score}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink-dim">rep</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded border border-line-soft bg-soft p-2">
              <div className="text-[18px] font-bold text-ink">{value}</div>
              <div className="text-[11px] text-ink-muted">{label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Badges</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {snapshot.badges.map((badge) => (
              <div key={badge.label} className={`rounded border p-2 ${badge.earned ? "border-brand bg-brand-soft" : "border-line-soft bg-soft opacity-70"}`}>
                <div className="text-[13px] font-bold text-ink">{badge.label}</div>
                <div className="text-[11.5px] text-ink-muted">{badge.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Top topics</div>
          {snapshot.topTopics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {snapshot.topTopics.map((topic) => <span key={topic} className="rounded-full border border-line bg-soft px-2 py-1 text-[11px] text-ink-muted">{topic}</span>)}
            </div>
          ) : (
            <p className="text-[12px] text-ink-muted">Post sourced claims to build topic expertise.</p>
          )}
        </div>
      </div>
    </section>
  );
}
