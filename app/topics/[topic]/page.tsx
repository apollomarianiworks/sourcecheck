import Link from "next/link";
import type { Metadata } from "next";
import { STARTER_PROMPTS, STARTER_TOPICS } from "@/lib/proofmedia/starter";

interface Props {
  params: Promise<{ topic: string }>;
}

export async function generateStaticParams() {
  return STARTER_TOPICS.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params;
  return {
    title: `${topic.replace(/-/g, " ")} | Proofbase topics`,
    description: `Proofbase topic page for ${topic.replace(/-/g, " ")} research prompts, evidence needs, and debate ideas.`,
  };
}

export default async function TopicPage({ params }: Props) {
  const { topic } = await params;
  const label = topic.replace(/-/g, " ");
  const prompts = STARTER_PROMPTS.filter((prompt) => prompt.topic === topic);

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2">
        <Link href="/topics" className="text-[12px] text-link hover:underline">All topics</Link>
        <h1 className="text-[28px] font-bold text-ink capitalize">{label}</h1>
        <p className="text-[14px] text-ink-muted max-w-2xl">
          This topic page is a local-first scaffold for future real activity summaries. It shows starter research actions, not fake trending or fake community posts.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Evidence needed" body="Look for primary sources, opposing evidence, timeline context, and expert sources before treating a claim as settled." />
        <Card title="Routine suggestion" body={`Create a Topic Watch routine for ${label} to rerun SourceMesh searches manually until scheduled jobs are implemented.`} />
        <Card title="Debate angle" body="Build pro/con arguments with source packets, weak evidence warnings, and open questions." />
      </section>

      <section className="card p-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Starter prompts</div>
          <h2 className="text-[17px] font-bold text-ink">Research actions for {label}</h2>
        </div>
        {prompts.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No topic-specific starter prompts yet. Use the general research search to build one.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {prompts.map((prompt) => (
              <Link key={prompt.id} href={prompt.href} className="rounded border border-line-soft bg-section p-3 no-underline hover:border-ink-deep">
                <div className="text-[14px] font-bold text-ink">{prompt.title}</div>
                <p className="text-[12px] text-ink-muted mt-1">{prompt.body}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className="card p-4">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      <p className="text-[12.5px] text-ink-muted mt-1">{body}</p>
    </article>
  );
}
