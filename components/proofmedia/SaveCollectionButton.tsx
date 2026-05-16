"use client";

import { useEffect, useState } from "react";
import { CollectionStore } from "@/lib/proofmedia/store";
import type { Collection, EvidenceAttachment } from "@/lib/proofmedia/types";
import { getLocalAccount } from "@/lib/auth/local";
import { uniqueId } from "@/lib/proofmedia/slug";

interface Props {
  /** What we're saving — either an evidence attachment OR a claim id. */
  evidence?: EvidenceAttachment;
  claimId?: string;
  /** Default collection name when prompting the user to create a new collection. */
  defaultCollectionName?: string;
}

/**
 * Tiny button that lets a user save an evidence card or a claim thread into
 * one of their existing collections (or create a new collection inline).
 * Local-only.
 */
export default function SaveCollectionButton({ evidence, claimId, defaultCollectionName }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [mounted, setMounted] = useState(false);
  const [newName, setNewName] = useState(defaultCollectionName ?? "");
  const [savedTo, setSavedTo] = useState<string | null>(null);

  useEffect(() => { setCollections(CollectionStore.list()); setMounted(true); }, []);

  if (!mounted) return null;

  function saveTo(c: Collection) {
    const itemId = uniqueId("ci");
    const next: Collection = {
      ...c,
      items: [
        {
          id: itemId,
          kind: evidence ? "evidence" : "claim",
          evidence,
          claimId,
          addedAt: new Date().toISOString(),
        },
        ...c.items,
      ],
    };
    CollectionStore.upsert(next);
    setSavedTo(c.name);
    setOpen(false);
    setCollections(CollectionStore.list());
    setTimeout(() => setSavedTo(null), 2000);
  }

  function createAndSave() {
    const name = (newName || "Untitled collection").trim();
    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    const collection: Collection = {
      id: uniqueId("col"),
      name,
      description: "",
      tags: [],
      isPublic: false,
      items: [],
      owner: {
        authorUsername: account?.username ?? "you",
        authorDisplayName: account?.displayName ?? "You",
        createdAt: stamp,
        updatedAt: stamp,
      },
    };
    saveTo(collection);
  }

  if (savedTo) {
    return <span className="text-[12px] text-verdict-green">✓ Saved to {savedTo}</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[12px] px-2 py-1 rounded border border-line text-ink-muted hover:bg-section hover:text-ink"
      >
        ▢ Save
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 card p-3 z-30 space-y-2 text-[13px]">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Save to collection</div>
          {collections.length === 0 ? (
            <div className="text-ink-dim text-[12px]">No collections yet — create one below.</div>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-line-soft border border-line rounded">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => saveTo(c)}
                    className="w-full text-left px-2 py-1.5 hover:bg-section"
                  >
                    {c.name}
                    <span className="text-ink-dim ml-1 text-[11px]">· {c.items.length} item{c.items.length === 1 ? "" : "s"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); createAndSave(); }}
            className="flex items-center gap-1 border-t border-line-soft pt-2"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New collection name"
              className="flex-1 px-2 py-1 border border-line rounded text-[12.5px]"
            />
            <button
              type="submit"
              className="text-[12px] bg-brand hover:bg-brand-hover text-white px-2 py-1 rounded"
            >
              Create
            </button>
          </form>
          <div className="text-[10.5px] text-ink-dim">Collections are stored only in this browser.</div>
        </div>
      )}
    </div>
  );
}
