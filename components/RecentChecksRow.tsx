"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEntry } from "@/lib/types";
import { loadHistory } from "@/lib/history";

interface Props {
  refreshKey?: number;
  onPick: (entry: HistoryEntry) => void;
}

const VERDICT_PILL: Record<HistoryEntry["verdict"], string> = {
  supports:       "bg-verdict-greenSoft text-verdict-green",
  disputes:       "bg-verdict-redSoft   text-verdict-red",
  mixed:          "bg-verdict-amberSoft text-verdict-amber",
  "related-only": "bg-verdict-graySoft  text-verdict-gray",
  none:           "bg-verdict-graySoft  text-verdict-gray",
};

const VERDICT_LABEL: Record<HistoryEntry["verdict"], string> = {
  supports:       "Supported",
  disputes:       "Disputed",
  mixed:          "Mixed",
  "related-only": "Unverified",
  none:           "No evidence",
};

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function RecentChecksRow({ refreshKey = 0, onPick }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    setMounted(true);
  }, [refreshKey]);

  if (!mounted) return null;
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recent-checks-heading" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 id="recent-checks-heading" className="text-[13px] text-ink-muted font-normal">
          Your recent checks
          <span className="text-ink-dim"> (stored in your browser)</span>
        </h2>
        <Link href="/history" className="text-[12px] text-link hover:underline">
          View all →
        </Link>
      </div>
      <ul className="divide-y divide-line-soft border border-line rounded bg-page">
        {entries.slice(0, 4).map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e)}
              className="w-full text-left px-3 py-2 row-hover transition-colors flex items-center gap-3 text-[13px]"
            >
              <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded ${VERDICT_PILL[e.verdict]} shrink-0`}>
                {VERDICT_LABEL[e.verdict]}
              </span>
              <span className="text-[10px] text-ink-dim uppercase tracking-wide shrink-0">{e.mode}</span>
              <span className="text-ink-body truncate flex-1" title={e.input}>{e.input}</span>
              {e.score !== null && (
                <span className="text-[12px] text-ink-muted shrink-0 font-mono-tight">
                  {e.score}/100
                </span>
              )}
              <span className="text-[11px] text-ink-dim shrink-0 w-14 text-right">{timeAgo(e.checkedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
