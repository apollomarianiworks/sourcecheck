"use client";

import type { ScanDepth } from "@/lib/types";

const OPTIONS: { id: ScanDepth; label: string; hint: string }[] = [
  { id: "quick", label: "Quick check", hint: "Fast — fact-checkers + news + Wikipedia" },
  { id: "deep",  label: "Deep check",  hint: "Thorough — more variants + full research report" },
];

interface Props {
  depth: ScanDepth;
  onChange: (d: ScanDepth) => void;
  disabled?: boolean;
}

export default function ScanDepthToggle({ depth, onChange, disabled }: Props) {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap text-[12px]" role="radiogroup" aria-label="Scan depth">
      {OPTIONS.map((o) => {
        const isActive = depth === o.id;
        return (
          <button
            key={o.id}
            onClick={() => !disabled && onChange(o.id)}
            disabled={disabled}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={o.hint}
            className={`
              px-3 py-1 rounded border transition-colors
              ${isActive
                ? "bg-brand-soft border-brand text-brand font-medium"
                : "bg-page border-line text-ink-muted hover:bg-section hover:border-ink-dim"
              }
              ${disabled ? "opacity-40 cursor-not-allowed" : ""}
            `}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
