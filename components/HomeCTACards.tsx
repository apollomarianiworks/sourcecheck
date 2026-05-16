"use client";

import Link from "next/link";

interface Props {
  onPickExample: (query: string) => void;
}

interface Card {
  title: string;
  body: string;
  action: { label: string; example?: string; href?: string };
  icon: string;
}

const CARDS: Card[] = [
  {
    icon: "🔍",
    title: "Check a claim",
    body: "Paste a statement and we'll cross-reference fact-checkers, news archives, and reference sources.",
    action: { label: "Try an example", example: "do vaccines cause autism" },
  },
  {
    icon: "🌐",
    title: "Check a website",
    body: "Paste a URL or domain. We'll score the source, analyze citation quality, and find independent coverage.",
    action: { label: "Try an example", example: "reuters.com" },
  },
  {
    icon: "⚖",
    title: "Compare sources",
    body: "Look up two domains side-by-side. See category, reputation, and warning flags.",
    action: { label: "Open Compare", href: "/compare" },
  },
];

export default function HomeCTACards({ onPickExample }: Props) {
  return (
    <section aria-labelledby="what-you-can-do" className="space-y-3">
      <h2 id="what-you-can-do" className="text-[13px] text-ink-muted text-center">
        What you can do with SourceCheck
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CARDS.map((c) => (
          <div key={c.title} className="card p-4 space-y-2 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[20px]" aria-hidden="true">{c.icon}</span>
              <h3 className="text-[15px] font-bold text-ink">{c.title}</h3>
            </div>
            <p className="text-[12.5px] text-ink-body leading-relaxed flex-1">{c.body}</p>
            {c.action.example ? (
              <button
                type="button"
                onClick={() => onPickExample(c.action.example!)}
                className="text-[12.5px] text-brand hover:underline self-start mt-1"
              >
                {c.action.label} →
              </button>
            ) : (
              <Link
                href={c.action.href ?? "/"}
                className="text-[12.5px] text-brand hover:underline self-start mt-1 no-underline"
              >
                {c.action.label} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
