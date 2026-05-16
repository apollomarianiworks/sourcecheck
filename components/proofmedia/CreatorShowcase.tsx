import Link from "next/link";
import { CREATOR_SHOWCASE_TEMPLATE } from "@/lib/proofmedia/ecosystem";

interface Props {
  title?: string;
  compact?: boolean;
}

export default function CreatorShowcase({ title = "Research creator profile", compact = false }: Props) {
  const showcase = CREATOR_SHOWCASE_TEMPLATE;
  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Creator mode</div>
          <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        </div>
        <span className="text-[11px] rounded bg-brand-soft text-brand px-2 py-1">{showcase.mode}</span>
      </div>
      <p className="text-[13px] text-ink-body">{showcase.statusLine}</p>
      <div className="flex flex-wrap gap-1.5">
        {showcase.expertise.map((item) => (
          <span key={item} className="text-[11px] rounded bg-section text-ink-body px-2 py-0.5">{item}</span>
        ))}
      </div>
      {!compact && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
            <Stat label="Collection saves" value={showcase.stats.collectionSaves} />
            <Stat label="Evidence citations" value={showcase.stats.evidenceCitations} />
            <Stat label="Helpful contributions" value={showcase.stats.helpfulContributions} />
          </div>
          <div className="space-y-1.5">
            {showcase.pinnedStatements.map((statement) => (
              <div key={statement} className="rounded border border-line-soft bg-section p-2 text-[12px] text-ink-body">{statement}</div>
            ))}
          </div>
        </>
      )}
      <Link href="/collections" className="text-[12px] text-link hover:underline">Feature collections and investigations</Link>
    </section>
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
