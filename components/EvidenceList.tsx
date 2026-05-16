"use client";

import { useMemo, useState } from "react";
import type { EvidenceItem } from "@/lib/types";
import EvidenceCard from "./EvidenceCard";

type SortKey = "authority" | "score" | "relevance" | "date";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "authority", label: "AUTHORITY" },
  { id: "score",     label: "SOURCE SCORE" },
  { id: "relevance", label: "RELEVANCE" },
  { id: "date",      label: "DATE" },
];

const RELEVANCE_RANK: Record<EvidenceItem["relevance"], number> = {
  high: 2, medium: 1, low: 0,
};

const TYPE_RANK: Record<EvidenceItem["evidenceType"], number> = {
  disputes: 0, supports: 1, unclear: 2, related: 3,
};

const SOURCE_RANK: Record<EvidenceItem["source"], number> = {
  "Fact Check": 0, "Domain DB": 1, "GDELT": 2, "Wikipedia": 3,
};

function sortEvidence(items: EvidenceItem[], key: SortKey): EvidenceItem[] {
  const copy = [...items];
  switch (key) {
    case "authority":
      copy.sort((a, b) => {
        const s = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
        if (s !== 0) return s;
        const t = TYPE_RANK[a.evidenceType] - TYPE_RANK[b.evidenceType];
        if (t !== 0) return t;
        return (b.domainScore ?? 0) - (a.domainScore ?? 0);
      });
      break;
    case "score":
      copy.sort((a, b) => (b.domainScore ?? -1) - (a.domainScore ?? -1));
      break;
    case "relevance":
      copy.sort((a, b) => {
        const r = RELEVANCE_RANK[b.relevance] - RELEVANCE_RANK[a.relevance];
        if (r !== 0) return r;
        return (b.domainScore ?? 0) - (a.domainScore ?? 0);
      });
      break;
    case "date":
      copy.sort((a, b) => {
        const ad = a.date ? Date.parse(a.date) : 0;
        const bd = b.date ? Date.parse(b.date) : 0;
        return bd - ad;
      });
      break;
  }
  return copy;
}

interface Props {
  items: EvidenceItem[];
}

export default function EvidenceList({ items }: Props) {
  const [sort, setSort] = useState<SortKey>("authority");
  const sorted = useMemo(() => sortEvidence(items, sort), [items, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-green-700 tracking-widest">
          EVIDENCE ({items.length} ITEM{items.length !== 1 ? "S" : ""})
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-green-800 tracking-widest mr-1">SORT:</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`
                text-[10px] tracking-widest px-2 py-0.5 border transition-all
                ${sort === s.id
                  ? "border-phosphor-green text-phosphor-green glow-green"
                  : "border-green-900 text-green-700 hover:text-green-500 hover:border-green-700"
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {sorted.map((item, i) => (
        <EvidenceCard key={`${item.source}-${item.url}-${i}`} item={item} index={i} />
      ))}
    </div>
  );
}
