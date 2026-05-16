import Link from "next/link";

const ACTIONS = [
  ["Check a claim", "Classify, search, and summarize public evidence."],
  ["Analyze a source", "Inspect source quality, metadata, and transparency."],
  ["Build a debate brief", "Prepare pro, con, context, and rebuttal packets."],
  ["Find articles", "Discover journalism, research, and official context."],
  ["Explain a term", "Turn confusing concepts into sourced context."],
  ["Check a social post", "Separate social metadata from independent evidence."],
];

const SOURCES = ["GDELT", "Wikipedia", "PubMed", "OpenAlex", "CourtListener", "RSS", "Semantic Scholar", "GitHub", "Stack Exchange"];

export default function PlatformOverview() {
  return (
    <section className="max-w-page mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="card p-5 space-y-4">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-ink-muted">What do you want to do?</div>
            <h2 className="text-[26px] font-bold text-ink">A research OS, not a truth detector</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACTIONS.map(([title, body]) => (
              <div key={title} className="border border-line-soft rounded p-3 bg-page">
                <div className="text-[14px] font-bold text-ink">{title}</div>
                <p className="text-[12px] text-ink-muted mt-1">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 space-y-4">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-ink-muted">Trust model</div>
            <h2 className="text-[24px] font-bold text-ink">Evidence first, uncertainty visible</h2>
          </div>
          <p className="text-[13px] text-ink-body leading-relaxed">
            Proofbase shows what was understood, what was searched, what sources failed or were skipped, which evidence is weak, and what better searches would improve the check.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((source) => <span key={source} className="text-[11px] border border-line-soft bg-section rounded px-2 py-0.5">{source}</span>)}
          </div>
          <div className="flex gap-2">
            <Link href="/debate" className="text-[13px] bg-brand text-white rounded px-3 py-2 hover:no-underline">Open Debate</Link>
            <Link href="/routines" className="text-[13px] border border-line rounded px-3 py-2 hover:bg-section hover:no-underline">Build Routine</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
