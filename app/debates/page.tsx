import type { Metadata } from "next";
import DebatesIndex from "./debates-index";
import DebateStage from "@/components/debate-live/DebateStage";

export const metadata: Metadata = {
  title: "Debates",
  description: "Structured evidence-first debates. Each side must cite real sources; audience voting is intentionally disabled until trust signals exist.",
};

export default function DebatesPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
      <DebatesIndex />
      <DebateStage />
    </main>
  );
}
