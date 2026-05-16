import type { Metadata } from "next";
import DebateTool from "./debate-tool";

export const metadata: Metadata = {
  title: "Debate Mode",
  description: "Build balanced, evidence-backed debate briefs with Proofbase.",
  alternates: { canonical: "/debate" },
};

export default function DebatePage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <header className="max-w-prose space-y-2">
        <div className="text-[12px] text-ink-muted uppercase tracking-wide">Debate toolkit</div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-ink">Build an evidence-backed debate brief</h1>
        <p className="text-[14px] text-ink-body">
          Proofbase searches for pro, con, and context packets, then shows missing evidence and questions for better argument.
        </p>
      </header>
      <DebateTool />
    </main>
  );
}
