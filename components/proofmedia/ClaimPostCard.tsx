"use client";

import Link from "next/link";
import type { ClaimThread } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";

const KIND_LABEL: Record<ClaimThread["kind"], string> = {
  "claim":              "Claim",
  "question":           "Question",
  "evidence-request":   "Evidence request",
  "timeline":           "Timeline",
  "article-discussion": "Article discussion",
  "debate-prompt":      "Debate prompt",
};

const VERDICT_PILL: Record<NonNullable<ClaimThread["sourceMeshSummary"]>["verdict"], { label: string; cls: string }> = {
  supports:       { label: "Supported",     cls: "bg-verdict-greenSoft text-verdict-green" },
  disputes:       { label: "Disputed",      cls: "bg-verdict-redSoft text-verdict-red" },
  mixed:          { label: "Mixed",         cls: "bg-verdict-amberSoft text-verdict-amber" },
  "related-only": { label: "Unverified",    cls: "bg-section text-ink-muted" },
  none:           { label: "No evidence",   cls: "bg-section text-ink-muted" },
};

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Props {
  claim: ClaimThread;
  /** Compact = feed row; default = full card. */
  variant?: "feed" | "full";
}

export default function ClaimPostCard({ claim, variant = "feed" }: Props) {
  const evidenceCount = claim.evidence.length;
  const rebuttalCount = claim.rebuttals.length;
  const noteCount = claim.contextNotes.length;
  const verdict = claim.sourceMeshSummary?.verdict;
  const verdictPill = verdict ? VERDICT_PILL[verdict] : null;

  return (
    <article className="card p-4 space-y-2.5 hover:border-ink-deep transition-colors">
      {/* Header: avatar + author + meta */}
      <div className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Avatar name={claim.owner.authorDisplayName} size={24} />
        <span className="text-ink-body font-medium">{claim.owner.authorDisplayName}</span>
        <span className="text-ink-dim">· {timeAgo(claim.owner.createdAt)}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded bg-section text-ink-body text-[11px]">
          {KIND_LABEL[claim.kind]}
        </span>
      </div>

      {/* Title — links to thread page */}
      <Link
        href={`/community/${claim.id}`}
        className="block text-[17px] font-bold text-ink leading-snug hover:underline"
      >
        {claim.title}
      </Link>

      {/* Body preview */}
      {variant === "feed" && claim.body && (
        <p className="text-[13.5px] text-ink-body leading-relaxed line-clamp-3 whitespace-pre-line">
          {claim.body.length > 280 ? claim.body.slice(0, 280).trim() + "…" : claim.body}
        </p>
      )}
      {variant === "full" && claim.body && (
        <p className="text-[14px] text-ink-body leading-relaxed whitespace-pre-line">{claim.body}</p>
      )}

      {/* Pills row */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {verdictPill && (
          <span className={`px-1.5 py-0.5 rounded font-medium ${verdictPill.cls}`}>
            SourceMesh: {verdictPill.label}
          </span>
        )}
        {claim.tags.slice(0, 4).map((t) => (
          <Link
            key={t}
            href={`/community?tag=${encodeURIComponent(t)}`}
            className="px-1.5 py-0.5 rounded bg-section text-ink-body hover:bg-line-soft no-underline"
          >
            #{t}
          </Link>
        ))}
        <span className="text-ink-dim ml-auto">
          {evidenceCount} evidence · {rebuttalCount} rebuttal{rebuttalCount === 1 ? "" : "s"} · {noteCount} note{noteCount === 1 ? "" : "s"}
        </span>
      </div>
    </article>
  );
}
