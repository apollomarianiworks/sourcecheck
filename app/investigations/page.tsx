import Link from "next/link";
import type { Metadata } from "next";
import { INVESTIGATION_TEMPLATES } from "@/lib/proofmedia/ecosystem";

export const metadata: Metadata = {
  title: "Investigations",
  description: "Create Proofbase investigations, timelines, evidence boards, and source maps.",
  alternates: { canonical: "/investigations" },
};

export default function InvestigationsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <header className="space-y-2 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Investigation mode</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink leading-tight">Evidence boards for messy public questions</h1>
        <p className="text-[14px] text-ink-body leading-relaxed">
          Investigations organize timelines, source maps, evidence clusters, unresolved questions, and conflicting evidence. Templates are local-first and do not claim that any live investigation has occurred.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INVESTIGATION_TEMPLATES.map((template) => (
          <Link key={template.id} href={`/investigations/${template.id}`} className="card p-4 space-y-3 no-underline hover:border-ink-deep transition-colors">
            <div>
              <h2 className="text-[18px] font-bold text-ink">{template.title}</h2>
              <p className="text-[13px] text-ink-body leading-relaxed mt-1">{template.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11.5px] text-ink-muted">
              <div className="rounded bg-section p-2"><strong className="block text-ink">{template.clusters.length}</strong> clusters</div>
              <div className="rounded bg-section p-2"><strong className="block text-ink">{template.timeline.length}</strong> events</div>
              <div className="rounded bg-section p-2"><strong className="block text-ink">{template.unresolvedQuestions.length}</strong> questions</div>
            </div>
            <div className="text-[12px] text-link">Open investigation template</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
