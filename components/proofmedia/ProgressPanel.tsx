"use client";

import { useEffect, useState } from "react";
import { buildProgressSnapshot, collectionHealthSnapshot } from "@/lib/proofmedia/engagement";

type Progress = ReturnType<typeof buildProgressSnapshot>;
type CollectionHealth = ReturnType<typeof collectionHealthSnapshot>;

export default function ProgressPanel() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [health, setHealth] = useState<CollectionHealth | null>(null);

  useEffect(() => {
    setProgress(buildProgressSnapshot());
    setHealth(collectionHealthSnapshot());
  }, []);

  if (!progress || !health) return null;

  return (
    <section className="card p-3.5 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Research profile</div>
        <h2 className="text-[15px] font-bold text-ink">Progress from real actions</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <Stat label="Evidence" value={progress.evidenceAdded} />
        <Stat label="Context notes" value={progress.contextNotes} />
        <Stat label="Collections" value={progress.collections} />
        <Stat label="Topics followed" value={progress.followedTopics} />
      </div>

      {progress.badges.length > 0 ? (
        <div className="space-y-1.5">
          {progress.badges.map((badge) => (
            <div key={badge.label} className="rounded border border-line bg-section px-2 py-1.5">
              <div className="text-[12px] font-semibold text-ink">{badge.label}</div>
              <div className="text-[11px] text-ink-muted">{badge.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Add evidence, follow topics, save useful posts, or build a collection to earn local profile badges.
        </p>
      )}

      <div className="border-t border-line-soft pt-2 text-[11.5px] text-ink-muted">
        Collection health: {health.totalItems} saved items, {health.sourceDiversity} source domains.
        {health.missingViewpointWarning && (
          <span className="block text-verdict-amber">Try adding more source diversity or opposing viewpoints.</span>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line-soft px-2 py-1.5">
      <div className="text-[18px] font-bold text-ink leading-none">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}
