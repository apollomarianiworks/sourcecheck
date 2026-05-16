"use client";

import type { ContextNote } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";
import EvidenceAttachmentCard from "./EvidenceAttachmentCard";

const KIND_META: Record<ContextNote["kind"], { label: string; cls: string }> = {
  "missing-context":         { label: "Missing context",        cls: "bg-section text-ink-body" },
  "timeline-clarification":  { label: "Timeline clarification", cls: "bg-section text-ink-body" },
  "source-warning":          { label: "Source warning",         cls: "bg-verdict-amberSoft text-verdict-amber" },
  "misleading-framing":      { label: "Misleading framing",     cls: "bg-verdict-amberSoft text-verdict-amber" },
  "correction":              { label: "Correction",             cls: "bg-verdict-redSoft text-verdict-red" },
  "follow-up-evidence":      { label: "Follow-up evidence",     cls: "bg-verdict-greenSoft text-verdict-green" },
};

interface Props { note: ContextNote; }

export default function ContextNoteCard({ note: n }: Props) {
  const meta = KIND_META[n.kind];
  return (
    <article className="card p-3.5 space-y-2 border-l-4 border-verdict-amber/60">
      <header className="flex items-center flex-wrap gap-2 text-[12px] text-ink-muted">
        <Avatar name={n.owner.authorDisplayName} size={22} />
        <span className="text-ink-body font-medium">{n.owner.authorDisplayName}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${meta.cls}`}>{meta.label}</span>
        <span className="px-1.5 py-0.5 rounded text-[10.5px] bg-section text-ink-muted">
          confidence: {n.confidence}
        </span>
        <span className="text-ink-dim ml-auto">{n.owner.createdAt.slice(0, 10)}</span>
      </header>
      <p className="text-[13.5px] text-ink-body leading-relaxed whitespace-pre-line">{n.body}</p>
      <div className="space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Sources</div>
        {n.evidence.map((e) => <EvidenceAttachmentCard key={e.id} evidence={e} variant="inline" />)}
        {n.evidence.length === 0 && (
          <div className="text-[12px] text-verdict-red">
            This note has no attached sources — context notes require evidence. Edit to add at least one source.
          </div>
        )}
      </div>
    </article>
  );
}
