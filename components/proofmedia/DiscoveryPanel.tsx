"use client";

import Link from "next/link";
import type { DiscoverySnapshot } from "@/lib/proofmedia/discovery";

export default function DiscoveryPanel({ snapshot }: { snapshot: DiscoverySnapshot }) {
  return (
    <div className="space-y-3">
      <section className="card p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Discovery engine</div>
            <h2 className="text-[16px] font-bold text-ink">{snapshot.activityLabel} from real activity</h2>
          </div>
          <span className="rounded bg-section px-2 py-1 text-[11px] text-ink-muted">
            {snapshot.hasActivity ? "live signals" : "low activity"}
          </span>
        </div>
        <p className="text-[12.5px] text-ink-muted leading-relaxed">
          Rankings use evidence, saves, comments, source richness, and followed topics. Proofbase does not fabricate trending items.
        </p>
        {snapshot.liveSignals.length > 0 ? (
          <div className="space-y-1">
            {snapshot.liveSignals.map((signal) => (
              <div key={signal} className="rounded border border-line-soft bg-soft px-2 py-1 text-[12px] text-ink-body">
                {signal}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border border-line-soft bg-soft px-2 py-1.5 text-[12px] text-ink-muted">
            No new real updates detected in this browser/session.
          </div>
        )}
      </section>

      <section className="card p-3.5 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Topics</div>
        {snapshot.topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {snapshot.topics.map((topic) => (
              <Link key={topic.label} href={`/topics/${topic.label}`} className="rounded-full border border-line bg-soft px-2 py-1 text-[11px] text-ink-muted hover:border-brand hover:text-brand hover:no-underline">
                {topic.label} · {topic.count}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-muted">No topic activity yet.</p>
        )}
      </section>

      <MiniList title="Rising debates" items={snapshot.risingDebates.map((item) => ({ href: `/community/${item.id}`, label: item.title, meta: `${item.evidenceCount} evidence / ${item.commentCount} comments` }))} />
      <MiniList title="Most cited sources" items={snapshot.mostCitedSources.map((item) => ({ href: `/?mode=source&q=${encodeURIComponent(item.domain)}`, label: item.domain, meta: `${item.count} citation${item.count === 1 ? "" : "s"}` }))} />
      <MiniList title="Source disputes" items={snapshot.sourceDisputes.map((item) => ({ href: `/community/${item.id}`, label: item.title, meta: "needs stronger evidence" }))} />
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: { href: string; label: string; meta: string }[] }) {
  return (
    <section className="card p-3.5 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map((item) => (
            <li key={`${title}-${item.href}-${item.label}`}>
              <Link href={item.href} className="block text-[12.5px] text-link hover:underline line-clamp-2">{item.label}</Link>
              <div className="text-[11px] text-ink-dim">{item.meta}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-ink-muted">No real activity in this section yet.</p>
      )}
    </section>
  );
}
