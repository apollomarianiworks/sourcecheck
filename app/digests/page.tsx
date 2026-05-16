import type { Metadata } from "next";
import { DIGEST_TEMPLATES } from "@/lib/proofmedia/ecosystem";

export const metadata: Metadata = {
  title: "Digests",
  description: "Daily and weekly Proofbase digest systems for research retention.",
  alternates: { canonical: "/digests" },
};

export default function DigestsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Daily and weekly digests</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink">Return for useful updates, not streak pressure</h1>
        <p className="text-[14px] text-ink-body">
          Digest templates organize new evidence, debates, context notes, routine results, and research trends. They are manual/in-app first until scheduled delivery exists.
        </p>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DIGEST_TEMPLATES.map((digest) => (
          <article key={digest.id} className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold text-ink">{digest.name}</h2>
              <span className="text-[11px] rounded bg-section text-ink-muted px-2 py-1">{digest.cadence}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {digest.includes.map((item) => <span key={item} className="text-[11px] rounded bg-brand-soft text-brand px-2 py-0.5">{item.replace(/-/g, " ")}</span>)}
            </div>
            <p className="text-[12px] text-ink-muted">Delivery: {digest.delivery.replace(/-/g, " ")}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
