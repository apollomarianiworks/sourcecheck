import type { Metadata } from "next";
import { TEAM_FOUNDATION_EXAMPLES } from "@/lib/proofmedia/ecosystem";

export const metadata: Metadata = {
  title: "Teams",
  description: "Proofbase team and group foundation for classrooms, clubs, and research teams.",
  alternates: { canonical: "/teams" },
};

export default function TeamsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <header className="space-y-2 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Group foundation</div>
        <h1 className="text-[30px] md:text-[38px] font-bold text-ink">Classrooms, clubs, newsrooms, and research teams</h1>
        <p className="text-[14px] text-ink-body">
          PASS 23 adds group, team collection, and team routine data foundations. Full team accounts, billing, invites, and permissions are future work.
        </p>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEAM_FOUNDATION_EXAMPLES.map((group) => (
          <article key={group.id} className="card p-4 space-y-3">
            <h2 className="text-[18px] font-bold text-ink">{group.name}</h2>
            <p className="text-[13px] text-ink-muted capitalize">Purpose: {group.purpose.replace(/-/g, " ")}</p>
            <div className="flex flex-wrap gap-1">
              {group.memberRoles.map((role) => <span key={role} className="text-[11px] rounded bg-section px-2 py-0.5 text-ink-body">{role}</span>)}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
