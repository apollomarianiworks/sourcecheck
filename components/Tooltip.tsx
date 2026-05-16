"use client";

import { useState, useId } from "react";

interface Props {
  term: string;
  explanation: string;
  children?: React.ReactNode;
}

/**
 * Accessible micro-tooltip. Renders an underlined term that reveals an
 * explanation on hover or keyboard focus. Used for educational glossary
 * items like "corroboration", "primary source", "misleading framing".
 */
export default function Tooltip({ term, explanation, children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="border-b border-dotted border-ink-dim hover:border-brand cursor-help text-ink-body bg-transparent p-0"
      >
        {children ?? term}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-30 left-0 top-full mt-1 w-64 p-2.5 text-[12px] leading-snug bg-page border border-line rounded shadow-md text-ink-body"
        >
          <span className="block font-semibold text-ink mb-0.5">{term}</span>
          <span className="block">{explanation}</span>
        </span>
      )}
    </span>
  );
}

export const GLOSSARY = {
  corroboration:
    "When several independent, credible sources report the same finding — stronger than any single source on its own.",
  "primary source":
    "The original document, study, ruling, or statement — not a news summary of it. Always preferred when available.",
  "misleading framing":
    "A claim that is technically true but presented in a way that creates a false impression — e.g. cherry-picked statistics or missing context.",
  "source quality score":
    "0–100. Measures the editorial track record of the outlets covering a topic, not the truth of the underlying claim.",
  confidence:
    "How strong the available evidence is — driven by source diversity, fact-checker presence, recency, and agreement. Not a probability that the claim is true.",
};
