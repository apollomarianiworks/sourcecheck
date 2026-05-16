"use client";

import type { EvidenceAttachment } from "@/lib/proofmedia/types";
import SourceCredibilityBadge from "./SourceCredibilityBadge";

interface Props {
  evidence: EvidenceAttachment;
  /** Inline = compact row. Default = full card. */
  variant?: "card" | "inline";
}

const TYPE_LABEL: Record<EvidenceAttachment["type"], string> = {
  article:      "Article",
  study:        "Study",
  government:   "Government",
  court:        "Court filing",
  video:        "Video",
  social:       "Social post",
  screenshot:   "Screenshot",
  pdf:          "PDF",
  other:        "Source",
};

const STANCE_LABEL: Record<EvidenceAttachment["stance"], { label: string; cls: string }> = {
  supports: { label: "Supports", cls: "bg-verdict-greenSoft text-verdict-green" },
  disputes: { label: "Disputes", cls: "bg-verdict-redSoft text-verdict-red" },
  context:  { label: "Context",  cls: "bg-section text-ink-body" },
  unclear:  { label: "Unclear",  cls: "bg-verdict-amberSoft text-verdict-amber" },
};

function googleFavicon(domain: string | null): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export default function EvidenceAttachmentCard({ evidence: e, variant = "card" }: Props) {
  const fav = googleFavicon(e.publisherDomain);
  const stance = STANCE_LABEL[e.stance];

  if (variant === "inline") {
    return (
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-2 py-1.5 rounded border border-line bg-page hover:bg-section text-[12.5px] no-underline"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {fav && <img src={fav} alt="" width={14} height={14} className="shrink-0" />}
        <span className="text-link truncate flex-1">{e.title || e.url}</span>
        <span className={`shrink-0 text-[10px] px-1 rounded ${stance.cls}`}>{stance.label}</span>
      </a>
    );
  }

  return (
    <article className="card p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {fav && <img src={fav} alt="" width={20} height={20} className="mt-1 shrink-0 rounded-sm bg-section" />}
        <div className="flex-1 min-w-0">
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium text-link hover:underline visited:text-link-visited block leading-snug"
          >
            {e.title || e.url}
          </a>
          <div className="text-[12px] text-verdict-green truncate mt-0.5">
            {e.publisherDomain || "unknown"}
            {e.publisher && <span className="text-ink-dim"> · {e.publisher}</span>}
            {e.publishedAt && <span className="text-ink-dim"> · {e.publishedAt.slice(0, 10)}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${stance.cls}`}>{stance.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-section text-ink-muted">{TYPE_LABEL[e.type]}</span>
            <SourceCredibilityBadge score={e.sourceQualityScore} category={e.sourceCategory ?? undefined} size="xs" />
            {e.warningFlags.slice(0, 2).map((f) => (
              <span key={f} className="text-[10px] px-1 py-0.5 rounded bg-verdict-amberSoft text-verdict-amber">{f}</span>
            ))}
          </div>
          {e.snippet && (
            <p className="text-[12.5px] text-ink-body mt-1.5 leading-relaxed">{e.snippet}</p>
          )}
          {e.whyItMatters && (
            <p className="text-[11.5px] text-ink-muted mt-1 italic border-l-2 border-line pl-2">
              Why it matters: {e.whyItMatters}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
