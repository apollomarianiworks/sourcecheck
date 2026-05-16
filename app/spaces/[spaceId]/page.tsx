import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DISCOVERY_SUGGESTIONS, INTELLIGENCE_SPACES, findSpace } from "@/lib/proofmedia/ecosystem";

interface Props { params: Promise<{ spaceId: string }>; }

export function generateStaticParams() {
  return INTELLIGENCE_SPACES.map((space) => ({ spaceId: space.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { spaceId } = await params;
  const space = findSpace(spaceId);
  return {
    title: space ? `${space.name} Space` : "Proofbase Space",
    description: space?.description ?? "Proofbase public intelligence space.",
  };
}

export default async function SpacePage({ params }: Props) {
  const { spaceId } = await params;
  const space = findSpace(spaceId);
  if (!space) notFound();

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2">
        <Link href="/spaces" className="text-[12px] text-link hover:underline">All spaces</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Intelligence space</div>
            <h1 className="text-[30px] md:text-[38px] font-bold text-ink">{space.name}</h1>
          </div>
          <span className="rounded border border-line px-2 py-1 text-[12px] text-ink-muted">No fake member counts</span>
        </div>
        <p className="text-[14px] text-ink-body max-w-3xl leading-relaxed">{space.description}</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-3">
          <Panel title="Discussion feed" label="Firestore-ready">
            <p>Space-specific claims and discussions will appear here once real posts are created. Until then, this space uses clearly labeled starter prompts.</p>
            <Link href={`/community?tag=${encodeURIComponent(space.defaultTags[0] ?? space.id)}`} className="text-link hover:underline">Browse matching community posts</Link>
          </Panel>
          <Panel title="Evidence collections" label="Collaborative">
            <p>Pin collections, source folders, debate packets, timelines, and context notes for this space.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {["Pinned resources", "Missing evidence", "Opposing viewpoints", "Source alternatives"].map((item) => (
                <div key={item} className="rounded border border-line-soft bg-section p-2 text-[12px] text-ink-body">{item}</div>
              ))}
            </div>
          </Panel>
          <Panel title="Debates and timelines" label="Manual first">
            <p>Prepare debate rooms, event timelines, and investigation boards without pretending live infrastructure exists.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/debate?topic=${encodeURIComponent(space.name)}`} className="text-[12px] rounded bg-brand text-white px-2 py-1 no-underline">Build debate brief</Link>
              <Link href="/investigations" className="text-[12px] rounded border border-line px-2 py-1 no-underline text-ink-body">Start investigation</Link>
            </div>
          </Panel>
        </div>

        <aside className="space-y-3">
          <Panel title="Starter prompt" label="Not activity">
            <p>{space.starterPrompt}</p>
          </Panel>
          <Panel title="Pinned resources" label="Templates">
            <ul className="space-y-1">
              {space.pinnedResources.map((resource) => <li key={resource}>{resource}</li>)}
            </ul>
          </Panel>
          <Panel title="Routine ideas" label="Manual runs">
            <ul className="space-y-1">
              {space.suggestedRoutines.map((routine) => <li key={routine}>{routine}</li>)}
            </ul>
          </Panel>
          <Panel title="Discovery prompts" label="Anti-echo chamber">
            <ul className="space-y-2">
              {DISCOVERY_SUGGESTIONS.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-link hover:underline">{item.title}</Link>
                  <p className="text-[11.5px] text-ink-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Panel({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 space-y-2 text-[13px] text-ink-body">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        <span className="text-[11px] rounded bg-section px-1.5 py-0.5 text-ink-muted">{label}</span>
      </div>
      {children}
    </section>
  );
}
