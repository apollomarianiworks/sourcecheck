"use client";

import { useState } from "react";
import type { EvidenceItem, EvidenceType } from "@/lib/types";

interface Props {
  item: EvidenceItem;
  index: number;
}

const SOURCE_PILL: Record<EvidenceItem["source"], { bg: string; text: string; label: string }> = {
  "Fact Check": { bg: "bg-verdict-amberSoft", text: "text-verdict-amber", label: "Fact-check" },
  "Domain DB":  { bg: "bg-section",           text: "text-ink-body",      label: "Source DB" },
  "GDELT":      { bg: "bg-section",           text: "text-link",          label: "News" },
  "Wikipedia":  { bg: "bg-section",           text: "text-ink-body",      label: "Wikipedia" },
};

const TYPE_PILL: Record<EvidenceType, { cls: string; label: string; why: string }> = {
  supports: {
    cls:   "bg-verdict-greenSoft text-verdict-green",
    label: "Supports",
    why:   "This source's rating aligns with the claim being checked.",
  },
  disputes: {
    cls:   "bg-verdict-redSoft text-verdict-red",
    label: "Disputes",
    why:   "This source's rating contradicts the claim being checked.",
  },
  unclear: {
    cls:   "bg-verdict-amberSoft text-verdict-amber",
    label: "Unclear",
    why:   "Rated as partly true / partly false / missing context.",
  },
  related: {
    cls:   "bg-section text-ink-muted",
    label: "Related",
    why:   "Covers the topic but does not directly evaluate the claim.",
  },
};

function googleFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export default function EvidenceCard({ item, index }: Props) {
  const [copied, setCopied] = useState(false);
  const src  = SOURCE_PILL[item.source];
  const type = TYPE_PILL[item.evidenceType];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <article
      className="card p-3 hover:bg-soft transition-colors animate-fade-in"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Favicon — Google's public favicon service. Loads safely; falls back to nothing. */}
        <img
          src={googleFavicon(item.domain)}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          className="mt-1 shrink-0 rounded-sm bg-section"
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
        />

        <div className="flex-1 min-w-0">
          {/* Title (search-engine-style blue link) */}
          <h3 className="text-[15px] leading-snug">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline visited:text-link-visited"
            >
              {item.title}
            </a>
          </h3>

          {/* Domain · publisher · date row */}
          <div className="text-[12px] text-verdict-green mt-0.5 truncate">
            {item.domain}
            <span className="text-ink-dim"> · {item.publisher}</span>
            {item.date && <span className="text-ink-dim"> · {item.date}</span>}
          </div>

          {/* Pills row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${src.bg} ${src.text}`}>{src.label}</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${type.cls}`}>{type.label}</span>
            {item.rating && (
              <span className="text-[11px] text-ink-muted italic">
                rated &ldquo;{item.rating}&rdquo;
              </span>
            )}
            {item.domainTier && item.domainTier !== "?" && (
              <span className="text-[11px] px-1.5 py-0.5 rounded border border-line text-ink-muted">
                Tier {item.domainTier}
              </span>
            )}
            {typeof item.domainScore === "number" && (
              <span className="text-[11px] text-ink-dim font-mono-tight">
                {item.domainScore}/100
              </span>
            )}
          </div>

          {/* Snippet */}
          {item.snippet && (
            <p className="text-[13px] text-ink-body leading-relaxed mt-1.5">{item.snippet}</p>
          )}

          {/* Why-it-matters strip */}
          <p className="text-[12px] text-ink-muted mt-1.5 italic">
            Why it matters: {type.why}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2 text-[12px]">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
              aria-label={`Open source in a new tab: ${item.title}`}
            >
              Open source ↗
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="text-ink-muted hover:text-brand"
            >
              {copied ? "✓ Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
