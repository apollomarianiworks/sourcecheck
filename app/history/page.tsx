"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEntry } from "@/lib/types";
import { loadHistory, clearHistory, removeHistoryEntry } from "@/lib/history";

const VERDICT_PILL: Record<HistoryEntry["verdict"], { cls: string; label: string }> = {
  supports:       { cls: "bg-verdict-greenSoft text-verdict-green", label: "Supported" },
  disputes:       { cls: "bg-verdict-redSoft text-verdict-red",     label: "Disputed" },
  mixed:          { cls: "bg-verdict-amberSoft text-verdict-amber", label: "Mixed" },
  "related-only": { cls: "bg-verdict-graySoft text-verdict-gray",   label: "Unverified" },
  none:           { cls: "bg-verdict-graySoft text-verdict-gray",   label: "No evidence" },
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

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    setLoaded(true);
  }, []);

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="max-w-result mx-auto space-y-5">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Your recent checks</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            Recent checks
          </h1>
          <p className="text-[13.5px] text-ink-body leading-relaxed">
            All checks are stored only in this browser&apos;s localStorage. Nothing is sent to a server.
            Clearing the list erases it permanently — it cannot be recovered.
          </p>
        </header>

        {!loaded ? (
          <div className="card p-6 text-[13px] text-ink-dim">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="card p-6 text-center space-y-3">
            <div className="text-ink-body">No history yet.</div>
            <Link
              href="/"
              className="inline-block bg-brand hover:bg-brand-hover text-white text-[13px] font-medium px-4 py-2 rounded no-underline"
            >
              Start your first check →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-muted">{entries.length} item{entries.length !== 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={() => { clearHistory(); setEntries([]); }}
                className="text-[12px] text-verdict-red hover:underline"
              >
                Clear all history
              </button>
            </div>

            <ul className="divide-y divide-line-soft border border-line rounded bg-page overflow-hidden">
              {entries.map((e) => {
                const v = VERDICT_PILL[e.verdict];
                return (
                  <li key={e.id} className="row-hover flex items-start gap-3 px-3 py-3">
                    <span className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded mt-0.5 ${v.cls}`}>{v.label}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                        <span className="uppercase tracking-wide">{e.mode}</span>
                        <span className="text-ink-dim">·</span>
                        <span className="uppercase tracking-wide">{e.depth ?? "quick"}</span>
                        <span className="text-ink-dim ml-auto">{timeAgo(e.checkedAt)}</span>
                      </div>
                      <div className="text-[14px] text-ink truncate mt-0.5" title={e.input}>{e.input}</div>
                      <div className="text-[12px] text-ink-muted">
                        {e.evidenceCount} source{e.evidenceCount !== 1 ? "s" : ""}
                        {e.score !== null && (<> · score <span className="font-mono-tight">{e.score}/100</span></>)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntries(removeHistoryEntry(e.id))}
                      className="text-ink-dim hover:text-verdict-red text-[14px] shrink-0 px-2"
                      aria-label={`Remove ${e.input} from history`}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="text-[12px] text-ink-muted leading-relaxed pt-3 border-t border-line-soft">
              Want to re-run one? Click any item&apos;s text, copy it, and paste into the {" "}
              <Link href="/" className="text-link hover:underline">search bar</Link>.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
