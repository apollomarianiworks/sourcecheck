import type { Metadata } from "next";
import CompareTool from "./compare-tool";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Compare two sources",
  description: "Look up two news outlets, fact-checkers, or domains side-by-side and compare their categories, base quality scores, warning flags, and recommended use.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="max-w-result mx-auto space-y-6">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Source explorer</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            Compare two sources
          </h1>
          <p className="text-[14px] text-ink-body">
            Enter two domains. See their reputation, category, warning flags, and recommended use side-by-side.
            Data comes from the local <a href="https://en.wikipedia.org/wiki/Wikipedia:Reliable_sources/Perennial_sources" target="_blank" rel="noopener noreferrer">source-reputation database</a> — no third-party API calls needed.
          </p>
        </header>
        <CompareTool />
      </div>
      <Footer />
    </main>
  );
}
