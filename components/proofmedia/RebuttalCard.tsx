"use client";

import type { Rebuttal } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";
import EvidenceAttachmentCard from "./EvidenceAttachmentCard";
import EvidenceVoteBar from "./EvidenceVoteBar";

interface Props { rebuttal: Rebuttal; }

export default function RebuttalCard({ rebuttal: r }: Props) {
  return (
    <article className="card p-3.5 space-y-2 border-l-4 border-verdict-red/60">
      <header className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Avatar name={r.owner.authorDisplayName} size={22} />
        <span className="text-ink-body font-medium">{r.owner.authorDisplayName}</span>
        <span className="text-ink-dim">posted a rebuttal</span>
        <span className="text-ink-dim ml-auto">{r.owner.createdAt.slice(0, 10)}</span>
      </header>
      <p className="text-[13.5px] text-ink-body leading-relaxed whitespace-pre-line">{r.body}</p>
      {r.evidence.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Supporting evidence</div>
          {r.evidence.map((e) => <EvidenceAttachmentCard key={e.id} evidence={e} variant="inline" />)}
        </div>
      )}
      <EvidenceVoteBar initialUp={r.votes.up} initialDown={r.votes.down} />
    </article>
  );
}
