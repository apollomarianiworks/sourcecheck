import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Proofbase consults public APIs, what each source provides, and what the Source Quality Score does and does not mean.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <article className="max-w-result mx-auto space-y-8">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Documentation</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            How it works
          </h1>
          <p className="text-[14px] text-ink-body leading-relaxed">
            Proofbase is a source-quality scanner. It does not decide truth — it consults
            public APIs and a local rules database, then shows you what each source said and how
            credible those sources are.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">Data sources</h2>
          <SourceCard
            name="Google Fact Check Tools API"
            status="Optional — free API key"
            href="https://developers.google.com/fact-check/tools/api"
            description="Indexes fact-check articles published by Politifact, Snopes, FactCheck.org, AFP, Reuters Fact Check, and dozens of other IFCN-verified outlets. When matching fact-checks exist for your claim, their textual rating drives the verdict label."
            limit="Free quota covers thousands of queries per day. Without an API key, this source is silently skipped."
          />
          <SourceCard
            name="GDELT 2.0 DOC API"
            status="Always on — no key required"
            href="https://gdelt.github.io/"
            description="Global news index covering tens of thousands of outlets in 65+ languages. We use it to find recent news coverage of a claim or domain. GDELT items are labeled 'Related' — we never infer a verdict from coverage alone."
            limit="GDELT only covers the last 30 days of news."
          />
          <SourceCard
            name="Wikimedia REST API"
            status="Always on — no key required"
            href="https://en.wikipedia.org/api/rest_v1/"
            description="Wikipedia's MediaWiki Search + REST summary endpoints. Used for background context — Wikipedia entries never drive the verdict."
            limit="Community-edited — orientation tool, not a primary source."
          />
          <SourceCard
            name="Local source rules"
            status="Always on — bundled"
            href="/limitations"
            description="A hand-curated JSON file (data/source-rules.json) listing ~80 publishers with their category, base quality score, warning flags, and recommended use. Guides quality scoring — does not decide truth automatically."
            limit="Unlisted domains fall back to TLD heuristics (.gov / .edu trusted, .info / .xyz penalized)."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">What the verdict labels mean</h2>
          <ul className="space-y-2 text-[13.5px]">
            <li className="card p-3">
              <span className="text-verdict-green font-bold">Evidence suggests this is supported</span>
              <span className="text-ink-body"> — Multiple reputable sources report findings consistent with the claim. Not a guarantee of truth.</span>
            </li>
            <li className="card p-3">
              <span className="text-verdict-red font-bold">Evidence suggests this is disputed</span>
              <span className="text-ink-body"> — Fact-checkers on balance rated the matching claim as false, misleading, or unsupported. Not a guarantee of falsehood.</span>
            </li>
            <li className="card p-3">
              <span className="text-verdict-amber font-bold">Conflicting reports detected</span>
              <span className="text-ink-body"> — Reviewers reached different conclusions. The claim likely depends on framing.</span>
            </li>
            <li className="card p-3">
              <span className="text-verdict-gray font-bold">Limited evidence found</span>
              <span className="text-ink-body"> — Either no fact-checker has rated this phrasing, or no source returned anything. Absence is not a verdict.</span>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">What the Source Quality Score means</h2>
          <p className="text-[14px] text-ink-body leading-relaxed">
            The 0–100 score is a measure of <em>outlet credibility</em> — the average editorial track record of the
            publishers covering your topic, with bonuses for fact-checker presence, source diversity, and recency.
          </p>
          <p className="text-[14px] text-ink-body leading-relaxed">
            It does <em>not</em> measure how likely the claim is to be true. A claim covered by Reuters and the New York Times
            gets a high score whether the claim itself is right or wrong — what we&apos;re saying is &ldquo;these are reputable
            outlets discussing this,&rdquo; not &ldquo;this is true.&rdquo;
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">What the tool cannot prove</h2>
          <ul className="text-[14px] text-ink-body space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>It cannot tell you a claim is &ldquo;100% true&rdquo; or &ldquo;100% false.&rdquo;</li>
            <li>It cannot read paywalled or login-gated articles.</li>
            <li>It cannot evaluate predictions about future events.</li>
            <li>It cannot replace a doctor, lawyer, or financial advisor.</li>
            <li>It cannot detect novel disinformation that no fact-checker has covered.</li>
            <li>It cannot tell whether sources are biased in ways their published track record hides.</li>
          </ul>
        </section>

        <section className="card-section p-4 space-y-2">
          <h2 className="text-[15px] font-bold text-ink">Ready to try?</h2>
          <p className="text-[13px] text-ink-body">
            Paste a claim, a URL, or a domain on the home page.
          </p>
          <Link
            href="/"
            className="inline-block bg-brand hover:bg-brand-hover text-white text-[13px] font-medium px-4 py-2 rounded no-underline"
          >
            Start a check →
          </Link>
        </section>
      </article>
      <Footer />
    </main>
  );
}

function SourceCard({
  name,
  status,
  href,
  description,
  limit,
}: {
  name: string;
  status: string;
  href: string;
  description: string;
  limit: string;
}) {
  return (
    <div className="card p-3.5 space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[15px] font-bold text-link hover:underline">
          {name} ↗
        </a>
        <span className="text-[11px] text-ink-muted">{status}</span>
      </div>
      <p className="text-[13px] text-ink-body leading-relaxed">{description}</p>
      <p className="text-[12px] text-ink-muted border-l-2 border-line pl-2 italic">
        Limit: {limit}
      </p>
    </div>
  );
}
