"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import { loadHistory, clearHistory, removeHistoryEntry } from "@/lib/history";

interface Props {
  refreshKey: number;
  onReplay: (entry: HistoryEntry) => void;
}

function verdictGlyph(v: HistoryEntry["verdict"]): string {
  switch (v) {
    case "supports":     return "◉";
    case "disputes":     return "✗";
    case "mixed":        return "◐";
    case "related-only": return "≈";
    case "none":         return "○";
  }
}

function verdictColor(v: HistoryEntry["verdict"]): string {
  switch (v) {
    case "supports":     return "text-phosphor-green";
    case "disputes":     return "text-phosphor-red";
    case "mixed":        return "text-phosphor-amber";
    case "related-only": return "text-phosphor-cyan";
    case "none":         return "text-green-800";
  }
}

function scoreColor(s: number | null): string {
  if (s === null) return "text-green-800";
  if (s >= 70) return "text-phosphor-green";
  if (s >= 50) return "text-phosphor-amber";
  return "text-phosphor-red";
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60)        return `${s}s ago`;
  if (s < 3600)      return `${Math.floor(s/60)}m ago`;
  if (s < 86400)     return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function HistoryPanel({ refreshKey, onReplay }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
  }, [refreshKey]);

  if (entries.length === 0) return null;

  return (
    <div className="crt-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-green-700 hover:text-phosphor-green tracking-widest"
      >
        <span>▣ SCAN HISTORY ({entries.length})</span>
        <span>{open ? "[−]" : "[+]"}</span>
      </button>

      {open && (
        <div className="border-t border-green-900/40 max-h-72 overflow-y-auto">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-green-900/20 hover:bg-green-950/30 group"
            >
              <span className={`${verdictColor(e.verdict)} text-base shrink-0 w-4 text-center`}>
                {verdictGlyph(e.verdict)}
              </span>
              <span className="text-[10px] text-green-800 border border-green-900 px-1 shrink-0 w-12 text-center">
                {e.mode.toUpperCase()}
              </span>
              <button
                onClick={() => onReplay(e)}
                className="flex-1 text-left text-xs text-green-500 hover:text-phosphor-green truncate"
                title={e.input}
              >
                {e.input}
              </button>
              <span className={`text-xs font-mono shrink-0 w-10 text-right ${scoreColor(e.score)}`}>
                {e.score ?? "—"}
              </span>
              <span className="text-[10px] text-green-900 shrink-0 w-14 text-right">
                {timeAgo(e.checkedAt)}
              </span>
              <button
                onClick={() => setEntries(removeHistoryEntry(e.id))}
                className="text-green-900 hover:text-phosphor-red text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="px-3 py-2">
            <button
              onClick={() => { clearHistory(); setEntries([]); }}
              className="text-[10px] text-green-900 hover:text-phosphor-red tracking-widest"
            >
              ▢ CLEAR ALL HISTORY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
