"use client";

import { useEffect, useState } from "react";

export default function FeedCommandSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search claims, sources, people, debates, collections..."
        className="w-full px-2 py-1 border border-line rounded text-[13px]"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded border border-line bg-page shadow-lg p-2">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Command search</div>
          {["source: .gov", "mode: debate", "tag: ai", "needs: primary source", "people:", "collection:"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(value ? `${value} ${suggestion}` : suggestion); setOpen(false); }}
              className="block w-full text-left rounded px-2 py-1 text-[12px] text-ink-muted hover:bg-section"
            >
              {suggestion}
            </button>
          ))}
          <div className="mt-1 border-t border-line-soft pt-1 text-[11px] text-ink-dim">Ctrl/⌘ K opens this search layer.</div>
        </div>
      )}
    </div>
  );
}
