"use client";

import Link from "next/link";
import type { ResearchProfile } from "@/lib/proofmedia/types";
import Avatar from "./Avatar";

interface Props { profile: ResearchProfile; }

const BADGE_META: Record<ResearchProfile["badges"][number]["kind"], string> = {
  "first-claim":          "First claim",
  "first-collection":     "First collection",
  "evidence-contributor": "Evidence contributor",
  "context-noter":        "Context noter",
  "debater":              "Debater",
  "researcher":           "Researcher",
  "transparency":         "Transparency",
};

export default function ResearchProfileCard({ profile: p }: Props) {
  return (
    <article className="card p-4 space-y-3">
      <header className="flex items-center gap-3">
        <Avatar name={p.displayName} size={44} />
        <div className="min-w-0">
          <Link
            href={`/profile/${p.username}`}
            className="block text-[16px] font-bold text-ink hover:underline truncate"
          >
            {p.displayName}
          </Link>
          <div className="text-[12px] text-ink-muted">@{p.username} · joined {p.joinedAt.slice(0, 10)}</div>
        </div>
      </header>
      {p.bio && <p className="text-[13px] text-ink-body leading-relaxed">{p.bio}</p>}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <Stat label="Claims posted"        value={p.metrics.claimsPosted} />
        <Stat label="Evidence added"       value={p.metrics.evidenceAdded} />
        <Stat label="Rebuttals"            value={p.metrics.rebuttalsPosted} />
        <Stat label="Context notes"        value={p.metrics.contextNotesPosted} />
        <Stat label="Debates"              value={p.metrics.debatesEntered} />
        <Stat label="Public collections"   value={p.metrics.collectionsPublic} />
      </dl>

      <div className="text-[11px] text-ink-dim border-t border-line-soft pt-2">
        Avg evidence/claim: <strong className="text-ink-body">{p.metrics.avgEvidencePerClaim.toFixed(1)}</strong>{" · "}
        Avg source quality: <strong className="text-ink-body">{p.metrics.avgSourceQualityScore.toFixed(0)}/100</strong>
      </div>

      {p.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.badges.map((b) => (
            <span key={b.kind} className="text-[10.5px] px-1.5 py-0.5 rounded bg-verdict-greenSoft text-verdict-green" title={b.detail}>
              ✓ {BADGE_META[b.kind]}
            </span>
          ))}
        </div>
      )}

      {p.topicInterests.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[11px] border-t border-line-soft pt-2">
          <span className="text-ink-muted mr-1">Interests:</span>
          {p.topicInterests.slice(0, 8).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-section text-ink-body">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-bold text-ink">{value}</span>
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}
