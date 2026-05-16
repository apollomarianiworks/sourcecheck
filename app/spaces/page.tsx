import Link from "next/link";
import type { Metadata } from "next";
import { INTELLIGENCE_SPACES } from "@/lib/proofmedia/ecosystem";

export const metadata: Metadata = {
  title: "Spaces",
  description: "Topic-focused Proofbase intelligence spaces for collaborative evidence work.",
  alternates: { canonical: "/spaces" },
};

export default function SpacesPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <header className="space-y-2 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Public intelligence spaces</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink leading-tight">Topic communities for serious evidence work</h1>
        <p className="text-[14px] text-ink-body leading-relaxed">
          Spaces are collaborative research rooms for collections, debates, timelines, routines, and source-backed discussion. This pass ships space structure and starter resources without fake members, fake posts, or fake activity.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {INTELLIGENCE_SPACES.map((space) => (
          <Link key={space.id} href={`/spaces/${space.id}`} className="card p-4 space-y-3 no-underline hover:border-ink-deep transition-colors">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-bold text-ink">{space.name}</h2>
              <span className="text-[11px] rounded bg-section text-ink-muted px-2 py-0.5">{space.moderationModel.replace(/-/g, " ")}</span>
            </div>
            <p className="text-[13px] text-ink-body leading-relaxed">{space.description}</p>
            <div className="flex flex-wrap gap-1">
              {space.defaultTags.map((tag) => (
                <span key={tag} className="text-[11px] rounded bg-brand-soft text-brand px-1.5 py-0.5">#{tag}</span>
              ))}
            </div>
            <div className="text-[12px] text-link">Open space workspace</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
