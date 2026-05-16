import Link from "next/link";
import type { Metadata } from "next";
import { STARTER_TOPICS } from "@/lib/proofmedia/starter";

export const metadata: Metadata = {
  title: "Topics | Proofbase",
  description: "Follow research topics and use them to shape Proofbase feed, routine, and debate suggestions.",
};

export default function TopicsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Topic following</div>
        <h1 className="text-[28px] font-bold text-ink">Choose what Proofbase should help you watch</h1>
        <p className="text-[14px] text-ink-muted max-w-2xl">
          Topic follows are local-first right now. They shape feed lanes, evidence-needed prompts, routine ideas, debate suggestions, and collection nudges without fake activity.
        </p>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STARTER_TOPICS.map((topic) => (
          <Link
            key={topic}
            href={`/topics/${topic}`}
            className="card p-4 hover:border-ink-deep transition-colors no-underline"
          >
            <h2 className="text-[16px] font-bold text-ink capitalize">{topic.replace(/-/g, " ")}</h2>
            <p className="text-[12.5px] text-ink-muted mt-1">
              Open topic prompts, evidence needs, routine ideas, and debate angles for this area.
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
