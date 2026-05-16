import type { Metadata } from "next";
import CollectionsDashboard from "@/components/proofmedia/CollectionsDashboard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collections",
  description: "Plan and organize Proofbase research collections.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <header className="max-w-prose space-y-2">
        <div className="text-[12px] text-ink-muted uppercase tracking-wide">Collections</div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-ink">Collections 2.0: research packets that keep working</h1>
        <p className="text-[14px] text-ink-body">
          Organize descriptions, notes, pinned evidence, timelines, saved searches, source diversity, and debate packets. Storage stays local-first until collaboration is ready.
        </p>
      </header>

      <CollectionsDashboard />

      <section className="card p-4 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Collaborative collection architecture</div>
          <h2 className="text-[20px] font-bold text-ink">Collections are becoming research hubs</h2>
          <p className="text-[13px] text-ink-muted max-w-3xl mt-1">
            PASS 23 adds the structure for contributors, editors, pinned evidence, revisions, source coverage, completion status, and missing-evidence sections. No fake collaborators are shown.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Feature title="Evidence sections" body="Group sources by claim, argument, timeline, context, or missing evidence." />
          <Feature title="Collaboration roles" body="Owner, editor, contributor, and viewer roles are modeled for future Firestore sharing." />
          <Feature title="Export-ready packets" body="Collections can become markdown, printable, or PDF-ready research packets later." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/exports" className="text-[12px] rounded bg-brand text-white px-3 py-1.5 no-underline">Export systems</Link>
          <Link href="/spaces" className="text-[12px] rounded border border-line px-3 py-1.5 text-ink-body no-underline">Attach to a space</Link>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded border border-line-soft bg-section p-3">
      <h3 className="text-[14px] font-bold text-ink">{title}</h3>
      <p className="text-[12px] text-ink-muted mt-1">{body}</p>
    </article>
  );
}
