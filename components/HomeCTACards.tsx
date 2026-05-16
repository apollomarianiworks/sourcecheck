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
    icon: "R",
    title: "Research",
    body: "Paste a messy question and SourceMesh will classify it, search public evidence, and show what is missing.",
    action: { label: "Try an example", example: "is the MrBeast lottery thing illegal?" },
  },
  {
    icon: "S",
    title: "Social evidence",
    body: "Paste a public social URL. Proofbase checks public metadata, source transparency, and independent corroboration.",
    action: { label: "Try an example", example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  },
  {
    icon: "D",
    title: "Debate toolkit",
    body: "Build pro, con, and context evidence packets for policy, social, political, and philosophical topics.",
    action: { label: "Open Debate", href: "/debate" },
  },
];
export default function HomeCTACards({ onPickExample }: Props) {
  return (
    <section aria-labelledby="what-you-can-do" className="space-y-3">
      <h2 id="what-you-can-do" className="text-[13px] text-ink-muted text-center">
        What you can do with Proofbase
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
                {c.action.label} -&gt;
              </button>
            ) : (
              <Link
                href={c.action.href ?? "/"}
                className="text-[12.5px] text-brand hover:underline self-start mt-1 no-underline"
              >
                {c.action.label} -&gt;
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
