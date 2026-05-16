import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exports",
  description: "Export Proofbase debate packets, evidence summaries, collections, investigations, and timelines.",
  alternates: { canonical: "/exports" },
};

const EXPORTS = [
  ["Debate packet", "Pro/con arguments, strongest evidence, open questions, rebuttal notes."],
  ["Evidence summary", "Plain-English summary, cited URLs, uncertainty, missing evidence."],
  ["Collection", "Sections, source diversity, pinned evidence, contributor notes."],
  ["Investigation", "Timeline, clusters, source map, unresolved questions, conflicting evidence."],
  ["Source comparison", "Framing, citation quality, omissions, relationship mapping."],
];

export default function ExportsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Export and share systems</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink">Turn research into portable evidence packets</h1>
        <p className="text-[14px] text-ink-body">
          PASS 23 defines shareable pages, markdown/text exports, printable layouts, and PDF-ready placeholders. Payment and locked premium exports are not enabled.
        </p>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {EXPORTS.map(([title, body]) => (
          <article key={title} className="card p-4 space-y-2">
            <h2 className="text-[17px] font-bold text-ink">{title}</h2>
            <p className="text-[13px] text-ink-muted">{body}</p>
            <div className="text-[11px] rounded bg-section text-ink-muted inline-block px-2 py-1">PDF-ready placeholder</div>
          </article>
        ))}
      </section>
    </main>
  );
}
