import type { Metadata } from "next";
import DebateView from "./debate-view";

export const metadata: Metadata = {
  title: "Debate room",
  description: "Structured evidence-first debate.",
};

interface Props { params: Promise<{ debateId: string }>; }

export default async function DebateRoomPage({ params }: Props) {
  const { debateId } = await params;
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <DebateView debateId={debateId} />
    </main>
  );
}
