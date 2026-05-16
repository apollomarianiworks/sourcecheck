import Link from "next/link";
import type { Metadata } from "next";
import { findSourceProfile } from "@/lib/proofmedia/ecosystem";
import { CATEGORY_META } from "@/lib/categories";

interface Props { params: Promise<{ domain: string }>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const source = findSourceProfile(decodeURIComponent(domain));
  return {
    title: `${source.displayName} Source Profile`,
    description: `Proofbase source transparency profile for ${source.domain}.`,
  };
}

export default async function SourceProfilePage({ params }: Props) {
  const { domain } = await params;
  const source = findSourceProfile(decodeURIComponent(domain));
  const category = source.category ? CATEGORY_META[source.category] : null;

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2">
        <Link href="/data-sources" className="text-[12px] text-link hover:underline">All data sources</Link>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Source reputation and transparency</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink">{source.displayName}</h1>
        <p className="text-[14px] text-ink-muted">{source.domain}</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-3">
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold text-ink">Transparency indicators</h2>
              <span className="text-[11px] rounded bg-section text-ink-muted px-2 py-0.5">{category?.label ?? "Unclassified"}</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {source.transparencyIndicators.map((item) => (
                <li key={item} className="rounded border border-line-soft bg-section p-2 text-[13px] text-ink-body">{item}</li>
              ))}
            </ul>
          </section>

          <section className="card p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-ink">Citation behavior</h2>
            <ul className="list-disc pl-4 space-y-1 text-[13px] text-ink-body">
              {source.citationBehavior.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="card p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-ink">Relationship map</h2>
            {source.relationshipDomains.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No related source domains in local profile yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {source.relationshipDomains.map((related) => (
                  <Link key={related} href={`/sources/${encodeURIComponent(related)}`} className="text-[12px] rounded border border-line px-2 py-1 text-ink-body no-underline hover:bg-section">
                    {related}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="card p-4 space-y-3">
            <h2 className="text-[16px] font-bold text-ink">Usage stats</h2>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Stat label="Citations" value={source.usageStats.citations} />
              <Stat label="Collections" value={source.usageStats.collections} />
              <Stat label="Debates" value={source.usageStats.debates} />
              <Stat label="Investigations" value={source.usageStats.investigations} />
            </div>
            <p className="text-[11.5px] text-ink-muted">Stats stay zero until real saved evidence uses this source.</p>
          </section>
          <section className="card p-4 space-y-2">
            <h2 className="text-[16px] font-bold text-ink">Challenge this source</h2>
            <p className="text-[12.5px] text-ink-muted">Future collaboration can attach source challenges, corrections, and relationship notes here.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line-soft p-2">
      <div className="text-[18px] font-bold text-ink leading-none">{value}</div>
      <div className="text-ink-muted">{label}</div>
    </div>
  );
}
