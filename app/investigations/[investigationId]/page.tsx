import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INVESTIGATION_TEMPLATES } from "@/lib/proofmedia/ecosystem";

interface Props { params: Promise<{ investigationId: string }>; }

export function generateStaticParams() {
  return INVESTIGATION_TEMPLATES.map((item) => ({ investigationId: item.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { investigationId } = await params;
  const item = INVESTIGATION_TEMPLATES.find((template) => template.id === investigationId);
  return {
    title: item ? `${item.title} Investigation` : "Proofbase Investigation",
    description: item?.description ?? "Proofbase investigation board.",
  };
}

export default async function InvestigationPage({ params }: Props) {
  const { investigationId } = await params;
  const board = INVESTIGATION_TEMPLATES.find((template) => template.id === investigationId);
  if (!board) notFound();

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2">
        <Link href="/investigations" className="text-[12px] text-link hover:underline">All investigations</Link>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Investigation template</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink">{board.title}</h1>
        <p className="text-[14px] text-ink-body max-w-3xl leading-relaxed">{board.description}</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-3">
          <section className="card p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-ink">Evidence clusters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {board.clusters.map((cluster) => (
                <div key={cluster.id} className="rounded border border-line-soft bg-section p-3">
                  <div className="text-[13px] font-semibold text-ink">{cluster.label}</div>
                  <div className="text-[11px] text-ink-muted">{cluster.evidenceUrls.length} linked sources</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-ink">Timeline</h2>
            {board.timeline.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No timeline events yet. Add dated claims, source links, and updates when real evidence is collected.</p>
            ) : (
              <ol className="space-y-2">{board.timeline.map((event) => <li key={event.id}>{event.title}</li>)}</ol>
            )}
          </section>

          <section className="card p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-ink">Source map</h2>
            <p className="text-[13px] text-ink-muted">Source relationships will appear after evidence URLs are added to this investigation.</p>
            <Link href="/sources/cdc.gov" className="text-[12px] text-link hover:underline">View example source profile</Link>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="card p-4 space-y-2">
            <h2 className="text-[16px] font-bold text-ink">Unresolved questions</h2>
            <ul className="list-disc pl-4 space-y-1 text-[13px] text-ink-body">
              {board.unresolvedQuestions.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </section>
          <section className="card p-4 space-y-2">
            <h2 className="text-[16px] font-bold text-ink">Conflicting evidence</h2>
            <p className="text-[13px] text-ink-muted">None added yet. Proofbase should surface conflict honestly once sources exist.</p>
          </section>
          <section className="card p-4 space-y-2">
            <h2 className="text-[16px] font-bold text-ink">Export-ready</h2>
            <p className="text-[13px] text-ink-muted">This board is structured for future markdown, printable, and PDF-ready investigation exports.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
