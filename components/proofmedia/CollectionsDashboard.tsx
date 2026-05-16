"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collectionHealthSnapshot } from "@/lib/proofmedia/engagement";
import { CollectionStore } from "@/lib/proofmedia/store";
import type { Collection } from "@/lib/proofmedia/types";

const BLUEPRINTS = ["Debate packet", "Timeline", "Source comparison", "Saved searches", "Primary-source folder", "Export-ready brief"];

export default function CollectionsDashboard() {
  const [collections, setCollections] = useState<Collection[]>([]);
  useEffect(() => setCollections(CollectionStore.list()), []);
  const health = useMemo(() => collectionHealthSnapshot(), [collections]);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric label="Collections" value={collections.length} />
        <Metric label="Saved items" value={health.totalItems} />
        <Metric label="Source diversity" value={health.sourceDiversity} />
        <Metric label="Collaboration" value="planned" />
      </section>

      {health.missingViewpointWarning && (
        <div className="rounded border border-verdict-amber bg-verdict-amberSoft p-3 text-[13px] text-verdict-amber">
          Source diversity is low. Add opposing sources, primary documents, or timeline context before exporting.
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold text-ink">Continue researching</h2>
            <Link href="/?mode=research" className="text-[12px] text-link hover:underline">New research search</Link>
          </div>
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
            </div>
          ) : (
            <div className="card p-5 text-[13px] text-ink-muted">
              No local collections yet. Save evidence from checks or use a blueprint. Proofbase will not invent recommended collections.
            </div>
          )}
        </div>
        <aside className="space-y-3">
          <div className="card p-3.5 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Collections 2.0</div>
            <p className="text-[12.5px] text-ink-muted">
              Architecture supports descriptions, notes, sections, pinned evidence, timelines, saved searches, debate packets, exports, stats, and collaboration placeholders.
            </p>
          </div>
          <div className="card p-3.5 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Blueprints</div>
            {BLUEPRINTS.map((blueprint) => (
              <div key={blueprint} className="rounded border border-line-soft bg-soft px-2 py-1.5 text-[12px] text-ink-body">{blueprint}</div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const domains = new Set(collection.items.map((item) => item.evidence?.publisherDomain).filter(Boolean));
  return (
    <article className="card p-4 space-y-3 hover:border-ink-deep transition-colors">
      <div>
        <Link href={`/collections/${collection.id}`} className="text-[16px] font-bold text-ink hover:underline">{collection.name}</Link>
        <p className="text-[12.5px] text-ink-muted mt-1">{collection.description || "No description yet."}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Items" value={collection.items.length} small />
        <Metric label="Sources" value={domains.size} small />
        <Metric label="Sections" value={Math.max(1, collection.tags.length)} small />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {collection.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full border border-line bg-soft px-2 py-1 text-[11px] text-ink-muted">{tag}</span>)}
      </div>
      <div className="text-[11px] text-ink-dim">Activity feed and collaborative editing are placeholders until real events exist.</div>
    </article>
  );
}

function Metric({ label, value, small = false }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className={`rounded border border-line-soft bg-soft ${small ? "p-2" : "p-3"}`}>
      <div className={`${small ? "text-[15px]" : "text-[22px]"} font-bold text-ink`}>{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}
