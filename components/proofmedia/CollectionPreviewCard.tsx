"use client";

import Link from "next/link";
import type { Collection } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";

interface Props { collection: Collection; }

export default function CollectionPreviewCard({ collection: c }: Props) {
  return (
    <article className="card p-4 space-y-2.5 hover:border-ink-deep transition-colors">
      <header className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Avatar name={c.owner.authorDisplayName} size={22} />
        <span className="text-ink-body">{c.owner.authorDisplayName}</span>
        <span className="text-ink-dim">· {c.items.length} item{c.items.length === 1 ? "" : "s"}</span>
        {c.isPublic && <span className="ml-auto px-1.5 py-0.5 rounded bg-section text-ink-body text-[11px]">marked public (local)</span>}
      </header>
      <Link
        href={`/collections/${c.id}`}
        className="block text-[16px] font-bold text-ink hover:underline leading-snug"
      >
        {c.name}
      </Link>
      {c.description && <p className="text-[13px] text-ink-body leading-relaxed line-clamp-2">{c.description}</p>}
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[11px]">
          {c.tags.slice(0, 5).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-section text-ink-body">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}
