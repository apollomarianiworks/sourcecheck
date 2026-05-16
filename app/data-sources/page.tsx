import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Data sources",
  description: "Every public API and dataset SourceCheck consults — what each one provides, what it doesn't, and whether it needs a key.",
  alternates: { canonical: "/data-sources" },
};

interface Row {
  name: string;
  category: string;
  key: "none" | "optional" | "required";
  endpoint: string;
  endpointUrl: string;
  what: string;
  notWhat: string;
  routedFor: string;
}

const SOURCES: Row[] = [
  {
    name: "Google Fact Check Tools API",
    category: "Fact-checker",
    key: "required",
    endpoint: "factchecktools.googleapis.com/v1alpha1/claims:search",
    endpointUrl: "https://developers.google.com/fact-check/tools/api",
    what: "Indexes fact-check articles published by Politifact, Snopes, FactCheck.org, AFP, Reuters Fact Check, Lead Stories, and dozens of other IFCN-verified outlets. Drives the supports/disputes/mixed verdict label.",
    notWhat: "Skipped silently when no FACTCHECK_API_KEY is configured. Fact-checks rated for a different phrasing of the claim are demoted to 'related' (not used as a verdict).",
    routedFor: "All claim categories.",
  },
  {
    name: "GDELT 2.0 DOC API",
    category: "News index",
    key: "none",
    endpoint: "api.gdeltproject.org/api/v2/doc/doc",
    endpointUrl: "https://gdelt.github.io/",
    what: "Real-time global news index. Tens of thousands of outlets across 65+ languages, indexed within minutes of publication.",
    notWhat: "Only the last ~30 days. Cannot assert stance — every GDELT item is labeled 'related'.",
    routedFor: "All categories — runs on every check.",
  },
  {
    name: "Wikimedia REST + MediaWiki Search",
    category: "Encyclopedia",
    key: "none",
    endpoint: "en.wikipedia.org/api/rest_v1/",
    endpointUrl: "https://en.wikipedia.org/api/rest_v1/",
    what: "English Wikipedia article search + summary endpoints. Background context — who, what, when, where.",
    notWhat: "Community-edited. Always orientation, never a primary source. Cannot assert stance.",
    routedFor: "All claim categories.",
  },
  {
    name: "arXiv API",
    category: "Pre-print archive",
    key: "none",
    endpoint: "export.arxiv.org/api/query",
    endpointUrl: "https://info.arxiv.org/help/api/index.html",
    what: "Open archive of preprints in physics, mathematics, computer science, quantitative biology, statistics, and economics.",
    notWhat: "NOT peer-reviewed at time of posting. Treat as preliminary; check the final journal version before citing.",
    routedFor: "science-research, technology.",
  },
  {
    name: "Crossref",
    category: "Scholarly metadata",
    key: "none",
    endpoint: "api.crossref.org/works",
    endpointUrl: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/",
    what: "DOI registration metadata for academic publications: title, abstract, authors, journal, year. Polite-pool requests via mailto.",
    notWhat: "Metadata only — indexing does not equal peer review or endorsement.",
    routedFor: "science-research, health-medical.",
  },
  {
    name: "PubMed (NCBI E-utilities)",
    category: "Biomedical literature",
    key: "optional",
    endpoint: "eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    endpointUrl: "https://www.ncbi.nlm.nih.gov/books/NBK25500/",
    what: "US National Library of Medicine biomedical literature index — clinical trials, case reports, systematic reviews.",
    notWhat: "Indexes the citation; the full text is usually on the publisher's site (often paywalled). Abstracts only.",
    routedFor: "health-medical, science-research.",
  },
  {
    name: "OpenAlex",
    category: "Open scholarly graph",
    key: "none",
    endpoint: "api.openalex.org/works",
    endpointUrl: "https://docs.openalex.org/",
    what: "Open scholarly knowledge graph — works, authors, institutions, citations. Includes retraction status.",
    notWhat: "Indexing does not equal endorsement. Retracted works are flagged in the evidence card.",
    routedFor: "science-research, health-medical.",
  },
  {
    name: "CourtListener",
    category: "Court opinions",
    key: "optional",
    endpoint: "courtlistener.com/api/rest/v4/search/",
    endpointUrl: "https://www.courtlistener.com/help/api/rest/",
    what: "Free Law Project search across US federal and state court opinions. Optional COURTLISTENER_API_KEY for higher rate limits.",
    notWhat: "Does not summarize legal outcomes — open the opinion itself for the holding.",
    routedFor: "legal-court.",
  },
  {
    name: "Hacker News (Algolia)",
    category: "Tech discussion",
    key: "none",
    endpoint: "hn.algolia.com/api/v1/search",
    endpointUrl: "https://hn.algolia.com/api",
    what: "Full-text search over Hacker News story submissions and discussions.",
    notWhat: "User-submitted aggregator. Popularity is not credibility. Discussion quality varies wildly.",
    routedFor: "technology.",
  },
  {
    name: "Reddit (public JSON)",
    category: "Social discussion",
    key: "none",
    endpoint: "reddit.com/search.json",
    endpointUrl: "https://www.reddit.com/dev/api/",
    what: "Anonymous public search across subreddits — best-effort.",
    notWhat: "Reddit blocks most public bots; this adapter often reports 'blocked' rather than 'error'. No editorial oversight. Always 'related'.",
    routedFor: "celebrity-viral.",
  },
  {
    name: "Curated RSS feeds",
    category: "Newsroom & gov bulletins",
    key: "none",
    endpoint: "14 reputable feeds (AP, NPR, BBC, PBS, FactCheck.org, PolitiFact, Snopes, CDC, NIH, NASA, BLS, Census, FTC, SEC)",
    endpointUrl: "https://github.com/sourcecheck/data/rss-sources.json",
    what: "Pulls fresh items from a hand-curated list of newsroom and government RSS feeds. 10-minute in-memory cache. Filters items against the user's query.",
    notWhat: "Headlines only — never treated as a verdict, even for fact-checker feeds (the verdict still needs the Google Fact Check API match).",
    routedFor: "All categories (general fallback) + politics-news + health-medical + finance-business.",
  },
  {
    name: "Local source rules",
    category: "Reputation database",
    key: "none",
    endpoint: "data/source-rules.json (bundled)",
    endpointUrl: "/how-it-works",
    what: "~80 hand-curated publisher entries: category, base quality score (0–100), warning flags, preferred use, editorial track-record notes.",
    notWhat: "Does not decide truth automatically. Unknown domains fall back to TLD heuristics (.gov / .edu trusted, .info / .xyz penalized).",
    routedFor: "All checks — fuels the Source Quality Score and verdict-confidence breakdown.",
  },
];

export default function DataSourcesPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 md:py-10">
      <article className="max-w-result mx-auto space-y-7">
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Transparency</div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold text-ink leading-tight">
            Data sources
          </h1>
          <p className="text-[14px] text-ink-body leading-relaxed">
            Every API, dataset, and rules file SourceCheck consults — what each one is for,
            what it isn&apos;t, whether it requires a key, and which claim categories route to it.
          </p>
        </header>

        <section className="card-section p-4 space-y-2">
          <h2 className="text-[16px] font-bold text-ink">How sources are chosen</h2>
          <p className="text-[13px] text-ink-body leading-relaxed">
            We detect the rough category of your claim (politics, health, science, legal, finance, tech, celebrity, general)
            and prioritise the sources most likely to have relevant evidence. <em>All</em> claims also run through the general
            pool — Google Fact Check Tools, GDELT, Wikipedia, and curated RSS feeds.
          </p>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            If a source fails, times out, or blocks our request, we show it transparently on the result page rather than hiding it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">All consulted sources ({SOURCES.length})</h2>
          <ul className="space-y-3">
            {SOURCES.map((s) => (
              <li key={s.name} className="card p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <a
                    href={s.endpointUrl}
                    target={s.endpointUrl.startsWith("http") ? "_blank" : undefined}
                    rel={s.endpointUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-[16px] font-bold text-link hover:underline"
                  >
                    {s.name} ↗
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <KeyBadge level={s.key} />
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted px-1.5 py-0.5 border border-line rounded">
                      {s.category}
                    </span>
                  </div>
                </div>
                <div className="text-[11.5px] text-ink-dim font-mono-tight break-all">{s.endpoint}</div>
                <p className="text-[13.5px] text-ink-body leading-relaxed">
                  <strong className="text-ink">What it does:</strong> {s.what}
                </p>
                <p className="text-[13px] text-ink-muted leading-relaxed border-l-2 border-line pl-2">
                  <strong className="text-ink-body">What it does NOT do:</strong> {s.notWhat}
                </p>
                <div className="text-[12px] text-ink-muted">
                  <strong>Routed for:</strong> {s.routedFor}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-section p-4 space-y-2">
          <h2 className="text-[16px] font-bold text-ink">What we do NOT use</h2>
          <ul className="text-[13px] text-ink-body space-y-1 list-disc pl-5 leading-relaxed">
            <li>No paid APIs of any kind. All evidence comes from free/public endpoints.</li>
            <li>No language model is used to invent verdicts, quotes, or sources. The stance comes only from real fact-checker output.</li>
            <li>No iframe embedding of arbitrary external sites.</li>
            <li>No bypassing of paywalls or login walls.</li>
            <li>No recursive crawling. URL extraction is single-GET, SSRF-protected.</li>
          </ul>
        </section>
      </article>
      <Footer />
    </main>
  );
}

function KeyBadge({ level }: { level: "none" | "optional" | "required" }) {
  if (level === "none") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-verdict-greenSoft text-verdict-green font-medium">No key</span>;
  }
  if (level === "optional") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-section text-ink-muted font-medium">Key optional</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-verdict-amberSoft text-verdict-amber font-medium">Key required</span>;
}
