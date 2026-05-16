import type { Metadata } from "next";
import CommunityTool from "./community-tool";

export const metadata: Metadata = {
  title: "Community",
  description: "Local-first evidence thread architecture for Proofbase.",
};

export default function CommunityPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 space-y-6">
      <section className="space-y-2">
        <div className="text-[12px] uppercase tracking-wide text-ink-muted">Community</div>
        <h1 className="text-[32px] font-bold text-ink leading-tight">Evidence-first discussion drafts</h1>
        <p className="text-[15px] text-ink-body max-w-3xl">
          Proofbase community is designed around claims, evidence attachments, rebuttals, context notes, and transparent sourcing. This pass keeps it local-first until accounts, moderation, and storage are ready.
        </p>
      </section>
      <CommunityTool />
    </main>
  );
}
