"use client";

import Link from "next/link";
import type { DebateRoom } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";

const STATUS_PILL: Record<DebateRoom["status"], { label: string; cls: string }> = {
  "draft":       { label: "Draft",       cls: "bg-section text-ink-muted" },
  "open":        { label: "Open",        cls: "bg-verdict-greenSoft text-verdict-green" },
  "in-progress": { label: "In progress", cls: "bg-verdict-amberSoft text-verdict-amber" },
  "closed":      { label: "Closed",      cls: "bg-section text-ink-muted" },
};

interface Props { room: DebateRoom; }

export default function DebateRoomCard({ room: r }: Props) {
  const status = STATUS_PILL[r.status];
  const evidence = r.rounds.reduce((s, rnd) => s + rnd.evidence.length, 0);
  return (
    <article className="card p-4 space-y-2.5 hover:border-ink-deep transition-colors">
      <header className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Avatar name={r.owner.authorDisplayName} size={22} />
        <span className="text-ink-body">{r.owner.authorDisplayName}</span>
        <span className="text-ink-dim">· started {r.owner.createdAt.slice(0, 10)}</span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[11px] ${status.cls}`}>{status.label}</span>
      </header>
      <Link
        href={`/debates/${r.id}`}
        className="block text-[16px] font-bold text-ink hover:underline leading-snug"
      >
        {r.topic}
      </Link>
      <p className="text-[13px] text-ink-body leading-relaxed">{r.prompt}</p>
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        {r.positions.map((p) => (
          <span key={p.id} className="px-1.5 py-0.5 rounded bg-section text-ink-body">
            {p.label}{p.ownerUsername ? ` · ${p.ownerUsername}` : " · (open)"}
          </span>
        ))}
        <span className="text-ink-dim ml-auto">
          {r.rounds.length} round{r.rounds.length === 1 ? "" : "s"} · {evidence} evidence
        </span>
      </div>
    </article>
  );
}
