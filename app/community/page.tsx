import type { Metadata } from "next";
import CommunityFeed from "./feed";

export const metadata: Metadata = {
  title: "ProofMedia community",
  description: "Evidence-first claims, debates, and context notes from the Proofbase community.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <CommunityFeed />
    </main>
  );
}
