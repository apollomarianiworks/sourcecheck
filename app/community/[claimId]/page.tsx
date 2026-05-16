import type { Metadata } from "next";
import ClaimThreadView from "./thread-view";

export const metadata: Metadata = {
  title: "Claim thread",
  description: "Evidence-first claim thread. Sources, rebuttals, context notes, and SourceMesh analysis in one place.",
};

interface Props { params: Promise<{ claimId: string }>; }

export default async function ClaimThreadPage({ params }: Props) {
  const { claimId } = await params;
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <ClaimThreadView claimId={claimId} />
    </main>
  );
}
