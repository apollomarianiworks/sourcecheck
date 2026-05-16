import type { Metadata } from "next";
import RoutineBuilder from "@/components/RoutineBuilder";

export const metadata: Metadata = {
  title: "Routines",
  description: "Create local-first repeatable Proofbase research workflows.",
};

export default function RoutinesPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 space-y-6">
      <section className="space-y-2">
        <div className="text-[12px] uppercase tracking-wide text-ink-muted">Routines</div>
        <h1 className="text-[32px] font-bold text-ink leading-tight">Repeatable research agents</h1>
        <p className="text-[15px] text-ink-body max-w-3xl">
          Routines are saved workflows you run manually today. They are built to become scheduled research agents later without pretending background automation exists now.
        </p>
      </section>
      <RoutineBuilder />
    </main>
  );
}
