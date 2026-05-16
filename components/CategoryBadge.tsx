"use client";

import type { SourceCategory } from "@/lib/categories";
import { CATEGORY_META, categoryToneColor } from "@/lib/categories";

interface Props {
  category: SourceCategory;
  inferred?: boolean;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, inferred, size = "md" }: Props) {
  const meta = CATEGORY_META[category];
  const colors = categoryToneColor(meta.tone);
  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5";

  return (
    <span className={`inline-flex items-center gap-1 border ${colors} ${sizeCls} tracking-widest`}>
      <span aria-hidden="true">{meta.glyph}</span>
      <span>{meta.label.toUpperCase()}</span>
      {inferred && <span className="text-[9px] text-green-800 ml-0.5">(inferred)</span>}
    </span>
  );
}
