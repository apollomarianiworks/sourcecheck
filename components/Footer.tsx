import Link from "next/link";

const REPORT_MAILTO = "mailto:reports@example.invalid?subject=Proofbase%20issue";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 pt-6 border-t border-line">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[13px] text-ink-body">
        <div>
          <div className="font-bold text-ink mb-2">Proofbase</div>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            A free, public source-quality scanner.
            Cross-references public APIs and a local source-reputation database.
            Not a truth detector.
          </p>
        </div>

        <div>
          <div className="font-bold text-ink mb-2">Product</div>
          <ul className="space-y-1">
            <li><Link href="/" className="text-ink-body hover:text-brand hover:underline">Check a claim or URL</Link></li>
            <li><Link href="/compare" className="text-ink-body hover:text-brand hover:underline">Compare sources</Link></li>
            <li><Link href="/explorer" className="text-ink-body hover:text-brand hover:underline">Source Explorer</Link></li>
            <li><Link href="/history" className="text-ink-body hover:text-brand hover:underline">Recent checks (local)</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-ink mb-2">Transparency</div>
          <ul className="space-y-1">
            <li><Link href="/how-it-works" className="text-ink-body hover:text-brand hover:underline">How it works</Link></li>
            <li><Link href="/data-sources" className="text-ink-body hover:text-brand hover:underline">Data sources</Link></li>
            <li><Link href="/limitations" className="text-ink-body hover:text-brand hover:underline">Limitations</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-ink mb-2">Help us</div>
          <ul className="space-y-1">
            <li>
              <a href={REPORT_MAILTO} className="text-ink-body hover:text-brand hover:underline">
                Report an issue ↗
              </a>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-body hover:text-brand hover:underline"
              >
                Source on GitHub ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-line-soft text-[11.5px] text-ink-muted space-y-1">
        <div>
          Data: Google Fact Check Tools (when API key present) · GDELT 2.0 ·
          Wikimedia · arXiv · Crossref · PubMed · OpenAlex · CourtListener ·
          Hacker News Algolia · curated RSS feeds · local source rules.
        </div>
        <div>
          Free · No account · No paid services · No tracking. © {year} Proofbase.
          Not a substitute for primary sources or professional advice.
        </div>
      </div>
    </footer>
  );
}
