"use client";

import type { SourceCategory } from "@/lib/categories";

interface Props {
  score: number | null;
  category?: SourceCategory | null;
  size?: "xs" | "sm";
}

function tone(score: number | null): { cls: string; label: string } {
  if (score === null) return { cls: "bg-section text-ink-muted",          label: "unknown" };
  if (score >= 85)    return { cls: "bg-verdict-greenSoft text-verdict-green", label: "high" };
  if (score >= 70)    return { cls: "bg-verdict-greenSoft text-verdict-green", label: "good" };
  if (score >= 55)    return { cls: "bg-verdict-amberSoft text-verdict-amber", label: "moderate" };
  if (score >= 40)    return { cls: "bg-verdict-amberSoft text-verdict-amber", label: "low" };
  return                       { cls: "bg-verdict-redSoft text-verdict-red",   label: "very low" };
}

/**
 * Tiny credibility chip used inline on evidence cards and post bylines.
 * NEVER labels a source as "true" — only as a credibility band.
 */
export default function SourceCredibilityBadge({ score, category, size = "sm" }: Props) {
  const t = tone(score);
  const px = size === "xs" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded ${t.cls} ${px}`}
      title={score === null ? "No reputation data on file" : `Source quality ${score}/100 (${t.label})`}
    >
      <span className="font-mono">{score ?? "—"}</span>
      <span className="opacity-80">{t.label}</span>
      {category && <span className="opacity-60">· {category.replace(/-/g, " ")}</span>}
    </span>
  );
}
