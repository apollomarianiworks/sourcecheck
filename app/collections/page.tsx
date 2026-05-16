import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections",
  description: "Plan and organize Proofbase research collections.",
  alternates: { canonical: "/collections" },
};

const EXAMPLES = [
  "AI Risk Sources",
  "Climate Change Research",
  "Best Nuclear Energy Arguments",
  "Ukraine Timeline",
  "Supreme Court Decisions",
];

export default function CollectionsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <header className="max-w-prose space-y-2">
        <div className="text-[12px] text-ink-muted uppercase tracking-wide">Collections</div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-ink">Research folders for evidence packets</h1>
        <p className="text-[14px] text-ink-body">
          Collection storage is local-first in this phase. The data model is ready for Firestore, D1, or KV once accounts land.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXAMPLES.map((title) => (
          <article key={title} className="card p-4 space-y-2">
            <div className="text-[15px] font-bold text-ink">{title}</div>
            <p className="text-[12.5px] text-ink-muted">
              Evidence packet, notes, source URLs, timeline entries, and debate prep will save here.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
