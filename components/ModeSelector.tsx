"use client";

import type { CheckMode } from "@/lib/types";

interface Props {
  mode: CheckMode;
  onChange: (m: CheckMode) => void;
  disabled?: boolean;
}

const MODES: { id: CheckMode; label: string; hint: string }[] = [
  { id: "claim",  label: "[1] CLAIM",  hint: "Natural language statement or assertion" },
  { id: "url",    label: "[2] URL",    hint: "Full URL — domain scored + news searched" },
  { id: "domain", label: "[3] DOMAIN", hint: "Domain or hostname — full reputation report" },
];

export default function ModeSelector({ mode, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-green-600 tracking-widest mb-1">
        SELECT SCAN MODE:
      </div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            className={`
              px-3 py-1 border transition-all duration-150 text-sm tracking-wider
              ${mode === m.id
                ? "border-phosphor-green text-phosphor-green glow-green bg-green-950/30"
                : "border-green-900 text-green-700 hover:border-green-600 hover:text-green-500"
              }
              ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-green-800 mt-1">
        ↳ {MODES.find((m) => m.id === mode)?.hint}
      </div>
    </div>
  );
}
