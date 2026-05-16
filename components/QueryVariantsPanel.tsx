"use client";

import { useState } from "react";
import type { SearchVariantUsed } from "@/lib/types";

interface Props {
  variants: SearchVariantUsed[];
}

export default function QueryVariantsPanel({ variants }: Props) {
  const [open, setOpen] = useState(false);
  if (variants.length === 0) return null;

  const totalResults = variants.reduce((s, v) => s + v.resultCount, 0);

  return (
    <div className="crt-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-green-700 hover:text-phosphor-green tracking-widest"
      >
        <span>⌬ SEARCH VARIANTS ({variants.length}) · {totalResults} HITS</span>
        <span>{open ? "[−]" : "[+]"}</span>
      </button>
      {open && (
        <div className="border-t border-green-900/40 p-3 space-y-1">
          {variants.map((v, i) => {
            const [api, kind] = v.label.split(":");
            return (
              <div key={i} className="flex items-baseline gap-2 text-[11px]">
                <span className="text-green-800 w-20 shrink-0 tracking-wider">{api?.toUpperCase()}</span>
                <span className="text-green-900 w-16 shrink-0 italic">{kind}</span>
                <span className="text-green-500 flex-1 truncate font-mono">
                  {v.query}
                </span>
                <span className={`text-[10px] shrink-0 w-8 text-right ${v.resultCount > 0 ? "text-phosphor-green" : "text-green-900"}`}>
                  {v.resultCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
