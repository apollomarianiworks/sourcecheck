"use client";

import { useState } from "react";
import Link from "next/link";
import { scoreDomain } from "@/lib/domain-scorer";
import { CATEGORY_META } from "@/lib/categories";
import { describeFlag } from "@/lib/source-rules";
import { detectSpoofing, analyzeUrlPath } from "@/lib/spoofing";
import { computeTransparency } from "@/lib/transparency";
import type { DomainAnalysis, EvidenceItem } from "@/lib/types";

const SUGGESTIONS = [
  "reuters.com", "apnews.com", "bbc.com", "npr.org",
  "nytimes.com", "wsj.com", "snopes.com", "politifact.com",
  "wikipedia.org", "cdc.gov", "nih.gov", "supremecourt.gov",
];

function cleanDomain(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[\/?#]/)[0];
}

export default function ExplorerTool() {
  const [input, setInput] = useState("");
  const [submittedDomain, setSubmittedDomain] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DomainAnalysis | null>(null);
  const [transparency, setTransparency] = useState<ReturnType<typeof computeTransparency> | null>(null);
  const [coverage, setCoverage] = useState<EvidenceItem[]>([]);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(rawDomain?: string) {
    const value = (rawDomain ?? input).trim();
    if (!value) return;
    const domain = cleanDomain(value);
    if (!domain) return;

    setSubmittedDomain(domain);
    setLoading(true);
    setCoverage([]);
    setCoverageError(null);

    const a = scoreDomain(domain);
    setAnalysis(a);
    const spoofing = detectSpoofing(domain);
    const pathSuspicion = analyzeUrlPath(`https://${domain}/`);
    setTransparency(computeTransparency(null, spoofing, pathSuspicion));

    // Fetch real coverage from /api/check (domain mode).
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "domain", input: domain, depth: "quick" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCoverageError(data?.error ?? `Coverage lookup failed (${res.status})`);
      } else {
        const data = await res.json();
        const items: EvidenceItem[] = (data?.evidence ?? []).filter((e: EvidenceItem) => e.source !== "Domain DB");
        setCoverage(items.slice(0, 8));
      }
    } catch (e) {
      setCoverageError(`Could not fetch recent coverage: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleLookup(); }
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-2">
        <label htmlFor="explorer-input" className="text-[11px] text-ink-muted uppercase tracking-wide block">
          Domain
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            id="explorer-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. reuters.com"
            className="flex-1 min-w-[12rem] px-3 py-2 border border-line rounded bg-page text-[15px] focus:border-brand"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={loading || !input.trim()}
            className={`px-4 py-2 rounded text-[14px] font-medium whitespace-nowrap transition-colors ${
              loading || !input.trim()
                ? "bg-section text-ink-dim cursor-not-allowed"
                : "bg-brand text-white hover:bg-brand-hover"
            }`}
          >
            {loading ? "Looking up…" : "Look up"}
          </button>
        </div>
      </div>

      {/* Quick picks */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Try a known publisher</div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setInput(s); handleLookup(s); }}
              className="text-[12px] px-2 py-1 rounded border border-line bg-chip hover:bg-section hover:border-ink-dim transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!submittedDomain && (
        <div className="card p-6 text-center space-y-1 text-[13px] text-ink-muted">
          <div className="font-bold text-ink">No domain yet</div>
          <p>Enter a publisher domain above to see what we know about it.</p>
        </div>
      )}

      {/* Results */}
      {submittedDomain && analysis && (
        <div className="space-y-4">
          <ReportCard analysis={analysis} />
          {transparency && transparency.factors.length > 0 && (
            <TransparencyBlock report={transparency} />
          )}
          <CoverageBlock loading={loading} items={coverage} error={coverageError} domain={submittedDomain} />
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-[12px] text-ink-muted bg-section border border-line-soft rounded p-3 leading-relaxed">
        <strong className="text-ink-body">Reminder:</strong> these scores describe a publisher&apos;s editorial track record, not whether
        any single story from them is correct. Use the explorer as one input alongside reading the source itself.
      </div>
    </div>
  );
}

function ReportCard({ analysis }: { analysis: DomainAnalysis }) {
  const cat = CATEGORY_META[analysis.category];
  const scoreText =
    analysis.finalScore >= 70 ? "text-verdict-green" :
    analysis.finalScore >= 50 ? "text-verdict-amber" :
                                "text-verdict-red";

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-[18px] font-bold text-ink truncate">{analysis.domain}</h2>
        <div className="flex items-baseline gap-2">
          <span className={`text-[26px] font-bold ${scoreText}`}>{analysis.finalScore}</span>
          <span className="text-ink-dim text-[12px]">/100</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-section text-ink-body">
          {cat.label}{analysis.categoryInferred ? " (inferred)" : ""}
        </span>
        {analysis.tier !== "?" && (
          <span className="text-[11px] px-1.5 py-0.5 rounded border border-line text-ink-muted">
            Tier {analysis.tier}
          </span>
        )}
        {analysis.tldBonus !== 0 && (
          <span className="text-[11px] text-ink-dim">
            TLD adj: {analysis.tldBonus > 0 ? "+" : ""}{analysis.tldBonus}
          </span>
        )}
      </div>

      <p className="text-[13.5px] text-ink-body leading-relaxed">{analysis.notes}</p>

      {analysis.preferredUse && (
        <div className="bg-soft border-l-2 border-line rounded-sm p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Best used for</div>
          <div className="text-[13px] text-ink-body mt-0.5">{analysis.preferredUse}</div>
        </div>
      )}

      {analysis.warningFlags.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Flags</div>
          <div className="flex flex-wrap gap-1">
            {analysis.warningFlags.map((f) => {
              const meta = describeFlag(f);
              const cls =
                meta.tone === "good"    ? "bg-verdict-greenSoft text-verdict-green" :
                meta.tone === "bad"     ? "bg-verdict-redSoft text-verdict-red" :
                meta.tone === "warn"    ? "bg-verdict-amberSoft text-verdict-amber" :
                                          "bg-section text-ink-muted";
              return (
                <span key={f} className={`text-[10.5px] px-1.5 py-0.5 rounded ${cls}`} title={f}>
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {analysis.tier === "?" && (
        <div className="text-[12px] text-ink-muted bg-section border border-line-soft rounded p-2">
          This domain is not in our reputation database. Score is derived from TLD heuristics and category inference only.
        </div>
      )}
    </div>
  );
}

function TransparencyBlock({ report }: { report: ReturnType<typeof computeTransparency> }) {
  const levelCls =
    report.level === "high"   ? "text-verdict-green" :
    report.level === "medium" ? "text-verdict-amber" :
                                "text-verdict-red";
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-[14px] font-bold text-ink">Citation & transparency signals</h3>
        <span className={`text-[13px] font-medium ${levelCls}`}>
          {report.score}/100 · {report.level}
        </span>
      </div>
      <p className="text-[12px] text-ink-muted leading-relaxed">
        Domain-level transparency signals derived from local rules + spoofing analysis.
        Page-level signals (author byline, publication date, outbound citations) are added when you submit a specific article URL via the home page.
      </p>
      <ul className="text-[12px] space-y-1 mt-1">
        {report.factors.map((f, i) => {
          const sign = f.delta > 0 ? "+" : "";
          const c =
            f.delta > 0 ? "text-verdict-green" :
            f.delta < 0 ? "text-verdict-red" :
                          "text-ink-muted";
          return (
            <li key={i} className="flex gap-2">
              <span className={`${c} font-mono-tight w-10 text-right shrink-0`}>
                {f.delta === 0 ? "·" : `${sign}${f.delta}`}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-ink-body">{f.label}</span>
                <span className="text-ink-muted"> — {f.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CoverageBlock({
  loading, items, error, domain,
}: { loading: boolean; items: EvidenceItem[]; error: string | null; domain: string }) {
  if (loading) {
    return (
      <div className="card p-4 text-[13px] text-ink-muted">
        Loading recent coverage about <strong className="text-ink">{domain}</strong>…
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-4 space-y-1.5">
        <h3 className="text-[14px] font-bold text-ink">Recent coverage</h3>
        <div className="text-[13px] text-verdict-red">{error}</div>
        <p className="text-[12px] text-ink-muted">
          We tried to fetch real coverage from public APIs. Try again in a minute.
        </p>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card p-4 space-y-1.5">
        <h3 className="text-[14px] font-bold text-ink">Recent coverage</h3>
        <p className="text-[13px] text-ink-muted">
          No recent news or encyclopedia items returned for <strong className="text-ink">{domain}</strong>.
          Either this domain has had no coverage in the last ~30 days, or our adapters were unable to fetch results.
        </p>
        <Link href="/" className="text-[13px] text-link hover:underline">Run a full check instead →</Link>
      </div>
    );
  }
  return (
    <div className="card p-4 space-y-2">
      <h3 className="text-[14px] font-bold text-ink">Recent coverage ({items.length})</h3>
      <p className="text-[12px] text-ink-muted">
        Real news / encyclopedia items returned by the same APIs the full checker uses. Sorted by source authority.
      </p>
      <ul className="space-y-2 mt-1">
        {items.map((it, i) => (
          <li key={i} className="border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13.5px] text-link hover:underline block"
            >
              {it.title}
            </a>
            <div className="text-[11px] text-ink-muted">
              {it.domain}{it.date ? <> · {it.date}</> : null}
              {it.source ? <> · <span className="text-ink-dim">{it.source}</span></> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
