"use client";

import { useState } from "react";
import type { EvidenceItem, EvidenceClusterPayload } from "@/lib/types";

interface Props {
  clusters: EvidenceClusterPayload[];
  evidence: EvidenceItem[];
}

const KIND_LABELS: Record<EvidenceClusterPayload["kind"], string> = {
  publisher: "BY PUBLISHER",
  stance:    "BY STANCE",
  story:     "BY STORY",
};

const KIND_COLORS: Record<EvidenceClusterPayload["kind"], string> = {
  publisher: "text-phosphor-cyan",
  stance:    "text-phosphor-amber",
  story:     "text-phosphor-green",
};

export default function ClustersPanel({ clusters, evidence }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (clusters.length === 0) return null;

  // Group clusters by kind for display
  const byKind: Record<EvidenceClusterPayload["kind"], EvidenceClusterPayload[]> = {
    publisher: [], stance: [], story: [],
  };
  for (const c of clusters) byKind[c.kind].push(c);

  return (
    <div className="crt-border p-4 space-y-4">
      <div className="text-xs text-green-700 tracking-widest">
        EVIDENCE CLUSTERS ({clusters.length})
      </div>

      {(["stance", "publisher", "story"] as const).map((kind) => {
        const list = byKind[kind];
        if (list.length === 0) return null;
        return (
          <div key={kind} className="space-y-1">
            <div className={`text-[10px] tracking-widest ${KIND_COLORS[kind]}`}>
              {KIND_LABELS[kind]}
            </div>
            <ul className="space-y-1">
              {list.map((c) => {
                const isOpen = openId === c.id;
                return (
                  <li key={c.id} className="border border-green-900/40">
                    <button
                      onClick={() => setOpenId(isOpen ? null : c.id)}
                      className="w-full px-2 py-1 flex items-center justify-between text-left hover:bg-green-950/30"
                    >
                      <span className="text-xs text-green-500 truncate">{c.label}</span>
                      <span className="text-[10px] text-green-800 ml-2 shrink-0">
                        {isOpen ? "[−]" : "[+]"}
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="border-t border-green-900/30 px-2 py-1 space-y-1">
                        {c.itemIndexes.map((idx) => {
                          const it = evidence[idx];
                          if (!it) return null;
                          return (
                            <li key={idx} className="text-[11px] flex gap-2">
                              <span className="text-green-800 shrink-0 w-12">{it.source}</span>
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-phosphor-green hover:underline truncate"
                              >
                                {it.title}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
