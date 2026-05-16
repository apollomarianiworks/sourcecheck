"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CollectionStore, ClaimStore } from "@/lib/proofmedia/store";
import type { Collection, CollectionItem } from "@/lib/proofmedia/types";
import EvidenceAttachmentCard from "@/components/proofmedia/EvidenceAttachmentCard";
import EmptyState from "@/components/proofmedia/EmptyState";
import LocalModeBanner from "@/components/proofmedia/LocalModeBanner";
import Avatar from "@/components/proofmedia/Avatar";

interface Props { collectionId: string; }

export default function CollectionView({ collectionId }: Props) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setCollection(CollectionStore.get(collectionId)); setMounted(true); }, [collectionId]);

  function save(next: Collection) { CollectionStore.upsert(next); setCollection(next); }

  function remove(itemId: string) {
    if (!collection) return;
    save({ ...collection, items: collection.items.filter((i) => i.id !== itemId), owner: { ...collection.owner, updatedAt: new Date().toISOString() } });
  }

  function addNote(body: string) {
    if (!collection || !body.trim()) return;
    save({
      ...collection,
      items: [
        { id: `n_${Date.now().toString(36)}`, kind: "note", noteBody: body.trim(), addedAt: new Date().toISOString() },
        ...collection.items,
      ],
      owner: { ...collection.owner, updatedAt: new Date().toISOString() },
    });
  }

  if (!mounted) return <div className="text-ink-dim text-[13px]">Loading…</div>;
  if (!collection) {
    return (
      <EmptyState
        icon="□"
        title="Collection not found"
        body="This collection isn't in your local browser storage. Collections you've saved on other devices won't appear here."
        cta={{ href: "/collections", label: "Back to collections →" }}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-result mx-auto">
      <div className="flex items-center gap-2 text-[12px]">
        <Link href="/collections" className="text-link hover:underline">← All collections</Link>
      </div>

      <LocalModeBanner />

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <Avatar name={collection.owner.authorDisplayName} size={22} />
          <span>{collection.owner.authorDisplayName}</span>
          <span className="text-ink-dim">· {collection.items.length} items · updated {collection.owner.updatedAt.slice(0, 10)}</span>
        </div>
        <h1 className="text-[26px] font-bold text-ink leading-tight">{collection.name}</h1>
        {collection.description && <p className="text-[14px] text-ink-body">{collection.description}</p>}
        {collection.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[11px]">
            {collection.tags.map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-section text-ink-body">#{t}</span>
            ))}
          </div>
        )}
      </header>

      {/* Items */}
      <section className="space-y-2">
        <h2 className="text-[14px] font-bold text-ink">Items</h2>
        {collection.items.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Empty collection. Save evidence cards from any claim thread or check result.</p>
        ) : (
          <ul className="space-y-2.5">
            {collection.items.map((it) => (
              <li key={it.id}>
                <ItemRow item={it} onRemove={() => remove(it.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add note */}
      <NoteForm onAdd={addNote} />

      <div className="text-[12px] text-ink-dim border-t border-line-soft pt-3 leading-relaxed">
        Collections are local-only in PASS 16. A future pass can sync to a real backend without changing your saved data.
      </div>
    </div>
  );
}

function ItemRow({ item, onRemove }: { item: CollectionItem; onRemove: () => void }) {
  if (item.kind === "evidence" && item.evidence) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0"><EvidenceAttachmentCard evidence={item.evidence} /></div>
        <button onClick={onRemove} className="text-[12px] text-ink-dim hover:text-verdict-red px-2 py-1" title="Remove">✕</button>
      </div>
    );
  }
  if (item.kind === "claim" && item.claimId) {
    const claim = ClaimStore.get(item.claimId);
    return (
      <div className="card p-3 flex items-start gap-2">
        <div className="flex-1">
          {claim ? (
            <Link href={`/community/${claim.id}`} className="text-[14px] text-link hover:underline">
              {claim.title}
            </Link>
          ) : (
            <span className="text-[13px] text-ink-muted italic">Claim {item.claimId} not found locally.</span>
          )}
          <div className="text-[11px] text-ink-dim">Added {item.addedAt.slice(0, 10)}</div>
        </div>
        <button onClick={onRemove} className="text-[12px] text-ink-dim hover:text-verdict-red px-2 py-1">✕</button>
      </div>
    );
  }
  if (item.kind === "note") {
    return (
      <div className="card p-3 flex items-start gap-2 bg-soft">
        <div className="flex-1">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Note</div>
          <p className="text-[13.5px] text-ink-body whitespace-pre-line leading-relaxed">{item.noteBody}</p>
          <div className="text-[11px] text-ink-dim">Added {item.addedAt.slice(0, 10)}</div>
        </div>
        <button onClick={onRemove} className="text-[12px] text-ink-dim hover:text-verdict-red px-2 py-1">✕</button>
      </div>
    );
  }
  return null;
}

function NoteForm({ onAdd }: { onAdd: (body: string) => void }) {
  const [body, setBody] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAdd(body); setBody(""); }}
      className="card p-3 space-y-1.5"
    >
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Add a research note</div>
      <textarea
        rows={2} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="A thought, summary, or follow-up question…"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
      />
      <div className="flex justify-end">
        <button type="submit" className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1 rounded">
          Add note
        </button>
      </div>
    </form>
  );
}
