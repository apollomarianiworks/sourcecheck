import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Limitations",
  description: "An honest list of what Proofbase can and cannot tell you.",
  alternates: { canonical: "/limitations" },
};

export default function LimitationsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <article className="max-w-result mx-auto space-y-7">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Documentation</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            Limitations
          </h1>
          <p className="text-[14px] text-ink-body leading-relaxed">
            This tool is useful. It is also limited. Knowing where it stops being useful is part
            of using it well.
          </p>
        </header>

        <Block title="What this tool DOES" tone="green">
          <ul className="space-y-1 list-disc pl-5">
            <li>Surfaces fact-check reviews published by major IFCN-verified outlets, when they exist.</li>
            <li>Indexes news coverage from the last ~30 days across 65+ languages via GDELT.</li>
            <li>Looks up encyclopedia background via Wikipedia.</li>
            <li>Scores the editorial credibility of the outlets covering a topic.</li>
            <li>Detects spoofed domains, obvious clickbait, and missing bylines on URLs you submit.</li>
            <li>Flags claim types that need expert review (medical, legal, financial).</li>
            <li>Shows you exactly which APIs returned which evidence — every card has a real, clickable URL.</li>
          </ul>
        </Block>

        <Block title="What this tool DOES NOT do" tone="amber">
          <ul className="space-y-1 list-disc pl-5">
            <li>It does not establish truth. The verdict reflects what fact-checkers said — not what is true in some absolute sense.</li>
            <li>It cannot read paywalled or login-gated articles.</li>
            <li>It cannot verify future predictions.</li>
            <li>It cannot evaluate opinions, value judgments, or contested definitions.</li>
            <li>It cannot detect novel disinformation that has not been fact-checked anywhere.</li>
            <li>It cannot replace a doctor, lawyer, financial advisor, or any other professional.</li>
            <li>It cannot guarantee that an outlet is unbiased — only that its track record is documented.</li>
          </ul>
        </Block>

        <Block title="Known data gaps" tone="gray">
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>GDELT only indexes the last 30 days.</strong> Older claims will return no news evidence.</li>
            <li><strong>Google Fact Check Tools coverage is uneven.</strong> Specific phrasings matter; rewording the claim can change which fact-checks match.</li>
            <li><strong>Local source rules cover ~80 outlets.</strong> Anything outside that list gets TLD-only inference.</li>
            <li><strong>Stance reconciliation is heuristic.</strong> Fact-check ratings that don&apos;t materially match your claim are demoted to &ldquo;related,&rdquo; not used as a verdict.</li>
            <li><strong>Big publishers often block bots.</strong> If we can&apos;t fetch a URL you submitted, domain-level signals are still shown.</li>
            <li><strong>English-language only.</strong> Non-English claims work only if matching English coverage exists.</li>
          </ul>
        </Block>

        <Block title="What we will NEVER do" tone="red">
          <ul className="space-y-1 list-disc pl-5">
            <li>Use mock data, fake demo results, or fake trending topics.</li>
            <li>Iframe arbitrary external sites — most block embedding, and it can hide source identity.</li>
            <li>Use AI to invent quotes, sources, or stances. The verdict comes from fact-checker output, not language-model guessing.</li>
            <li>Require an account, payment, or share your queries with third parties beyond the public APIs we consult.</li>
            <li>Claim a result is &ldquo;100% true&rdquo; or &ldquo;100% false&rdquo; or use &ldquo;AI truth detector&rdquo; framing.</li>
          </ul>
        </Block>

        <Block title="When you should NOT rely on this alone" tone="red">
          <ul className="space-y-1 list-disc pl-5">
            <li>Medical decisions — talk to a licensed clinician.</li>
            <li>Legal decisions — talk to a licensed attorney.</li>
            <li>Financial decisions — talk to a licensed advisor.</li>
            <li>Time-sensitive breaking news that may still be developing.</li>
            <li>Topics where you need the primary source (a study, ruling, or filing) — find that, not a news summary.</li>
          </ul>
        </Block>

        <div className="text-[13px] text-ink-body border-l-2 border-line pl-3 italic">
          Use this tool as one input in your verification process, alongside primary sources and
          your own judgement. It is a transparency layer for source quality, not an oracle.
        </div>
      </article>
      <Footer />
    </main>
  );
}

function Block({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "green" | "amber" | "red" | "gray";
  children: React.ReactNode;
}) {
  const tones = {
    green: "border-verdict-green/40 bg-verdict-greenSoft",
    amber: "border-verdict-amber/40 bg-verdict-amberSoft",
    red:   "border-verdict-red/40   bg-verdict-redSoft",
    gray:  "border-line             bg-section",
  } as const;
  return (
    <section className={`border ${tones[tone]} rounded p-4 space-y-2`}>
      <h2 className="text-[16px] font-bold text-ink">{title}</h2>
      <div className="text-[13.5px] text-ink-body leading-relaxed">{children}</div>
    </section>
  );
}
