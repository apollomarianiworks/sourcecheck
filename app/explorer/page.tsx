import type { Metadata } from "next";
import ExplorerTool from "./explorer-tool";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Source Explorer",
  description: "Look up a publisher: see its category, transparency score, citation behavior, reputation notes, warning flags, and recent coverage.",
  alternates: { canonical: "/explorer" },
};

export default function ExplorerPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="max-w-result mx-auto space-y-6">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Tool</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            Source Explorer
          </h1>
          <p className="text-[14px] text-ink-body leading-relaxed">
            Enter a domain. We&apos;ll show its category, transparency score, citation behavior,
            reputation notes, warning flags, and a sample of recent coverage from public news
            archives — all from free public APIs.
          </p>
        </header>
        <ExplorerTool />
      </div>
      <Footer />
    </main>
  );
}
