"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CheckMode, CheckResult, HistoryEntry, ScanDepth } from "@/lib/types";
import { validateInput } from "@/lib/validate";
import { appendHistory } from "@/lib/history";
import { detectMode } from "@/lib/detect-mode";

import VerdictBadge from "./VerdictBadge";
import ScoreDisplay from "./ScoreDisplay";
import EvidenceList from "./EvidenceList";
import AnalysisPanel from "./AnalysisPanel";
import ExportButton from "./ExportButton";
import DomainIntelPanel from "./DomainIntelPanel";
import PageAnalysisPanel from "./PageAnalysisPanel";
import ClaimLabelsPanel from "./ClaimLabelsPanel";
import ClustersPanel from "./ClustersPanel";
import QueryVariantsPanel from "./QueryVariantsPanel";
import ScanDepthToggle from "./ScanDepthToggle";
import DeepReportPanel from "./DeepReportPanel";
import ConfidencePanel from "./ConfidencePanel";
import SafetyWarningsPanel from "./SafetyWarningsPanel";
import SuggestionsPanel from "./SuggestionsPanel";
import SuggestionChips from "./SuggestionChips";
import RecentChecksRow from "./RecentChecksRow";
import ResultSidebar from "./ResultSidebar";
import SourceCoveragePanel from "./SourceCoveragePanel";
import Tooltip, { GLOSSARY } from "./Tooltip";

const STATUS_LINES = [
  "Querying fact-checkers…",
  "Searching news archive…",
  "Looking up reference sources…",
  "Scoring sources…",
  "Assembling evidence…",
];

const MODE_HINT: Record<CheckMode, string> = {
  claim:  "Will be checked as a claim — fact-checkers + news + Wikipedia",
  url:    "Will be checked as a URL — page scan + domain reputation",
  domain: "Will be checked as a domain — reputation + news + Wikipedia",
};

export default function Scanner() {
  const [input, setInput] = useState("");
  const [depth, setDepth] = useState<ScanDepth>("quick");
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [hasUsedToolBefore, setHasUsedToolBefore] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const detectedMode: CheckMode = input.trim() ? detectMode(input) : "claim";

  useEffect(() => {
    // First-run hint logic — show until the user actually scans something
    try {
      setHasUsedToolBefore(window.localStorage.getItem("sourcecheck.firstrun.dismissed") === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (input.trim().length === 0) {
      setValidationError(null);
      return;
    }
    const v = validateInput(detectedMode, input);
    setValidationError(v.ok ? null : v.message ?? null);
  }, [input, detectedMode]);

  async function handleScan() {
    if (loading) return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;

    const mode = detectedMode;
    const v = validateInput(mode, trimmed);
    if (!v.ok) { setValidationError(v.message ?? "Invalid input."); return; }

    setResult(null);
    setError(null);
    setLoading(true);
    setStatusLine(0);

    intervalRef.current = setInterval(() => {
      setStatusLine((s) => (s + 1) % STATUS_LINES.length);
    }, 850);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: trimmed, depth }),
      });

      let data: { error?: string } & Partial<CheckResult>;
      try { data = await res.json(); }
      catch { throw new Error("Server returned an invalid response."); }

      if (!res.ok) {
        const msg =
          res.status === 429
            ? `Too many requests right now. Wait ${res.headers.get("Retry-After") ?? "a minute"} and try again.`
            : res.status >= 500
            ? "We could not retrieve live evidence from upstream sources right now. Try again shortly."
            : data.error ?? `Request failed (${res.status}).`;
        setError(msg);
      } else {
        const r = data as CheckResult;
        setResult(r);
        appendHistory(r);
        setHistoryKey((k) => k + 1);
        try { window.localStorage.setItem("sourcecheck.firstrun.dismissed", "1"); } catch { /* ignore */ }
        setHasUsedToolBefore(true);
        setTimeout(() => {
          document.getElementById("scan-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    } catch (e) {
      const isNet = e instanceof Error && /failed to fetch|network/i.test(e.message);
      setError(isNet
        ? "Network error — check your internet connection."
        : `We could not retrieve live evidence right now. (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleScan();
    }
  }

  function replay(entry: HistoryEntry) {
    setInput(entry.input);
    setResult(null);
    setError(null);
    inputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canScan = input.trim().length > 0 && !loading && !validationError;

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section aria-labelledby="hero-title" className="text-center space-y-4 pt-8 md:pt-14 pb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand text-white rounded-md text-2xl font-bold mx-auto mb-1" aria-hidden="true">
          ✓
        </div>
        <h1 id="hero-title" className="font-display text-[34px] md:text-[44px] font-bold text-ink leading-tight">
          <span className="text-brand">Source</span>Check
        </h1>
        <p className="text-[15px] md:text-base text-ink-body max-w-prose mx-auto">
          Check claims. Inspect sources. Compare evidence.
        </p>

        {/* Search box */}
        <div className="max-w-2xl mx-auto pt-3 space-y-2 text-left">
          <label htmlFor="hero-search" className="sr-only">
            Search a claim, URL, or domain
          </label>
          <div
            className={`
              flex items-start gap-2 rounded border-2 bg-page p-2.5
              ${validationError ? "border-verdict-red" : "border-line focus-within:border-brand"}
              transition-colors
            `}
          >
            <span className="text-ink-dim mt-1 select-none shrink-0" aria-hidden="true">🔍</span>
            <textarea
              ref={inputRef}
              id="hero-search"
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Paste a claim, article URL, or domain…  e.g. "do vaccines cause autism" or reuters.com'
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-[15px] text-ink placeholder-ink-dim disabled:opacity-50 leading-relaxed border-0 outline-none focus:ring-0"
              style={{ minHeight: "1.6rem", maxHeight: "8rem" }}
              aria-describedby="search-hint"
              aria-invalid={!!validationError}
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={!canScan}
              className={`
                px-4 py-1.5 rounded text-[14px] font-medium whitespace-nowrap transition-colors
                ${canScan
                  ? "bg-brand text-white hover:bg-brand-hover"
                  : "bg-section text-ink-dim cursor-not-allowed"}
              `}
              aria-label={loading ? "Scanning" : "Check"}
            >
              {loading ? "Checking…" : "Check"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[12px] flex-wrap">
            <div id="search-hint" className="text-ink-muted">
              {input.trim() ? MODE_HINT[detectedMode] : "Press Enter to check"}
            </div>
            {validationError && <div className="text-verdict-red" role="alert">{validationError}</div>}
          </div>

          <div className="pt-1.5">
            <ScanDepthToggle depth={depth} onChange={setDepth} disabled={loading} />
          </div>
        </div>

        {/* First-run onboarding hint */}
        {!hasUsedToolBefore && !loading && !result && (
          <div className="max-w-2xl mx-auto text-[12.5px] text-ink-muted bg-section border border-line-soft rounded px-3 py-2 text-left">
            <strong className="text-ink-body">First time?</strong> Paste any factual claim, news article URL,
            or domain. We&apos;ll cross-reference public fact-checkers, news archives, and reference sources,
            then show you what they actually said — never an AI-invented verdict.
          </div>
        )}
      </section>

      {/* Suggestion chips */}
      <div className="max-w-2xl mx-auto">
        <SuggestionChips onPick={(q) => { setInput(q); inputRef.current?.focus(); }} />
      </div>

      {/* Recent checks (from real localStorage) */}
      <div className="max-w-2xl mx-auto">
        <RecentChecksRow refreshKey={historyKey} onPick={replay} />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="max-w-2xl mx-auto card p-4 space-y-3" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-2 text-[14px] text-ink-body">
            <span className="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" aria-hidden="true" />
            {STATUS_LINES[statusLine]}<span className="cursor" aria-hidden="true" />
          </div>
          <div className="w-full bg-section h-1 rounded overflow-hidden">
            <div className="h-full bg-brand/40 animate-pulse" style={{ width: "60%" }} />
          </div>
          <div className="text-[11px] text-ink-dim">
            Running real searches against public APIs. Partial results will still be shown if some sources fail.
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div role="alert" className="max-w-2xl mx-auto card border-verdict-red/40 bg-verdict-redSoft p-4 space-y-2">
          <div className="text-[14px] font-bold text-verdict-red">Check failed</div>
          <p className="text-[13px] text-ink-body">{error}</p>
          <button
            type="button"
            onClick={handleScan}
            className="text-[13px] bg-verdict-red text-white hover:bg-brand-hover px-3 py-1.5 rounded"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {result && !loading && <ResultLayout result={result} onPickRelated={(q) => { setInput(q); inputRef.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}

      {/* Educational micro-glossary footer — only show on hero state */}
      {!loading && !result && (
        <section className="max-w-2xl mx-auto pt-2">
          <div className="text-[12px] text-ink-muted leading-relaxed">
            <span className="text-ink-body font-medium">Glossary:</span>{" "}
            <Tooltip term="corroboration" explanation={GLOSSARY.corroboration} />{" · "}
            <Tooltip term="primary source" explanation={GLOSSARY["primary source"]} />{" · "}
            <Tooltip term="misleading framing" explanation={GLOSSARY["misleading framing"]} />{" · "}
            <Tooltip term="source quality score" explanation={GLOSSARY["source quality score"]} />{" · "}
            <Tooltip term="confidence" explanation={GLOSSARY.confidence} />
          </div>
        </section>
      )}
    </div>
  );
}

function Section({
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="card overflow-hidden group"
    >
      <summary className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-section transition-colors">
        <span className="text-[14px] font-bold text-ink">{title}</span>
        <span className="text-ink-dim text-[11px] select-none" aria-hidden="true">
          <span className="group-open:hidden">▸ Show</span>
          <span className="hidden group-open:inline">▾ Hide</span>
        </span>
      </summary>
      <div className="px-3.5 pb-3.5 pt-2 border-t border-line-soft">
        {children}
      </div>
    </details>
  );
}

function ResultLayout({ result, onPickRelated }: { result: CheckResult; onPickRelated: (q: string) => void }) {
  const claimSummary = result.input.length > 200
    ? result.input.slice(0, 200).trim() + "…"
    : result.input;

  // "Related claim" suggestions — sourced from the actual search-variants the
  // server tried. NEVER fake.
  const relatedQueries = Array.from(new Set(
    result.searchVariants
      .filter((v) => v.query.trim() !== result.input.trim() && v.resultCount > 0)
      .map((v) => v.query)
  )).slice(0, 4);

  return (
    <section
      id="scan-result"
      aria-labelledby="result-title"
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-8 animate-fade-in"
    >
      {/* Main column */}
      <div className="space-y-5 min-w-0">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap text-[12px]">
            <div className="text-ink-muted">
              <span className="uppercase tracking-wide">Result</span>
              <span className="text-ink-dim"> · {result.mode} · {result.depth === "deep" ? "Deep scan" : "Quick scan"}</span>
            </div>
            <ExportButton result={result} />
          </div>

          <h2 id="result-title" className="text-[20px] md:text-[24px] font-bold text-ink leading-snug">
            {claimSummary}
          </h2>

          {result.normalizedInput && result.normalizedInput !== result.input && (
            <div className="text-[12px] text-ink-dim">
              Normalized: <span className="font-mono-tight text-ink-body">{result.normalizedInput}</span>
            </div>
          )}

          <VerdictBadge verdict={result.evidenceVerdict} />

          <ScoreDisplay score={result.sourceQualityScore} />

          {/* Plain-English explanation */}
          <p className="text-[13.5px] text-ink-body leading-relaxed bg-soft border-l-2 border-line p-3 rounded-sm">
            {result.summary}
          </p>
        </header>

        <ClaimLabelsPanel labels={result.claimLabels} missing={result.missingSignals} />
        <SafetyWarningsPanel warnings={result.safetyWarnings} />
        <ConfidencePanel confidence={result.confidence} />
        <SourceCoveragePanel
          coverage={result.sourceCoverage}
          coverageLevel={result.coverageLevel}
          category={result.claimCategory}
        />

        {result.deepReport && (
          <DeepReportPanel report={result.deepReport} evidence={result.evidence} result={result} />
        )}

        <Section id="section-evidence" title={`Evidence (${result.evidence.length})`}>
          {result.evidence.length > 0 ? (
            <EvidenceList items={result.evidence} />
          ) : (
            <div className="text-[13px] text-ink-muted">
              No evidence cards returned. See the sidebar for which APIs were consulted.
            </div>
          )}
        </Section>

        <Section id="section-breakdown" title="Source breakdown" defaultOpen={false}>
          <AnalysisPanel result={result} />
        </Section>

        {result.clusters.length > 0 && (
          <Section id="section-clusters" title={`Evidence clusters (${result.clusters.length})`} defaultOpen={false}>
            <ClustersPanel clusters={result.clusters} evidence={result.evidence} />
          </Section>
        )}

        {result.domainIntel && (
          <Section id="section-domain" title="Domain intelligence" defaultOpen={false}>
            <DomainIntelPanel
              intel={result.domainIntel}
              transparency={result.transparency}
              analysis={result.domainAnalysis}
            />
          </Section>
        )}

        {result.pageIntel && (
          <Section id="section-page" title="Citation quality scan" defaultOpen={false}>
            <PageAnalysisPanel page={result.pageIntel} />
          </Section>
        )}

        {result.searchVariants.length > 0 && (
          <Section id="section-variants" title={`Why this result was shown (${result.searchVariants.length} queries)`} defaultOpen={false}>
            <QueryVariantsPanel variants={result.searchVariants} />
          </Section>
        )}

        <Section id="section-suggestions" title="What would improve this check?" defaultOpen={false}>
          <SuggestionsPanel suggestions={result.suggestions} />
        </Section>

        <Section id="section-limitations" title="Limitations of this check" defaultOpen={false}>
          <ul className="text-[13px] text-ink-body space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Source Quality Score reflects outlet credibility, not claim truth.</li>
            <li>GDELT news coverage only extends back ~30 days.</li>
            <li>Wikipedia and GDELT do not assert stance — they are context, not verdict.</li>
            <li>Paywalled or login-gated articles cannot be inspected.</li>
            <li>Non-English claims may return little English-language coverage.</li>
            <li>This tool does not establish truth. It surfaces what credible outlets said.</li>
          </ul>
          <div className="mt-2 text-[12px]">
            <Link href="/limitations" className="text-link hover:underline">Full limitations page →</Link>
          </div>
        </Section>

        {/* Related claims — uses real search variants only */}
        {relatedQueries.length > 0 && (
          <div className="card p-3.5 space-y-2">
            <div className="text-[12px] text-ink-muted uppercase tracking-wide">Related searches</div>
            <ul className="space-y-1">
              {relatedQueries.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => onPickRelated(q)}
                    className="text-[13px] text-link hover:underline text-left"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-ink-dim">
              These are the query variants we actually ran. Click any to rerun with that wording.
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card-section p-4 text-center space-y-2">
          <div className="text-[15px] text-ink font-bold">Check another claim?</div>
          <p className="text-[13px] text-ink-muted">
            Different wording can match different fact-checks. Try rephrasing or narrowing the claim.
          </p>
          <button
            type="button"
            onClick={() => { onPickRelated(""); }}
            className="inline-block bg-brand hover:bg-brand-hover text-white text-[14px] font-medium px-4 py-2 rounded"
          >
            New search ↑
          </button>
        </div>

        {/* Disclaimer */}
        <div className="text-[12px] text-ink-dim border-t border-line-soft pt-3 leading-relaxed">
          SourceCheck aggregates publicly available signals. It does not claim absolute truth.
          Source Quality Score reflects outlet credibility — not a verdict. Always consult primary sources.
        </div>
      </div>

      <ResultSidebar result={result} />
    </section>
  );
}
