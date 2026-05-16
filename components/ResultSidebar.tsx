"use client";

import Link from "next/link";
import type { CheckResult } from "@/lib/types";
import ShareMenu from "./ShareMenu";
import ReportIssueButton from "./ReportIssueButton";

interface Props { result: CheckResult; }

const API_LABELS: Record<keyof CheckResult["apiStatus"], string> = {
  factcheck: "Google Fact Check Tools",
  gdelt:     "GDELT 2.0 DOC API",
  wikipedia: "Wikimedia REST API",
};

function dotColor(state: CheckResult["apiStatus"]["gdelt"]) {
  switch (state) {
    case "ok":           return "bg-verdict-green";
    case "rate-limited": return "bg-verdict-amber";
    case "no-key":       return "bg-ink-deep";
    case "error":        return "bg-verdict-red";
  }
}

function stateLabel(state: CheckResult["apiStatus"]["gdelt"]) {
  switch (state) {
    case "ok":           return "OK";
    case "rate-limited": return "rate limited";
    case "no-key":       return "no key";
    case "error":        return "error";
  }
}

function confidenceColor(level: CheckResult["confidence"]["level"]) {
  switch (level) {
    case "high":         return "text-verdict-green";
    case "medium":       return "text-link";
    case "low":          return "text-verdict-amber";
    case "insufficient": return "text-verdict-red";
  }
}

export default function ResultSidebar({ result }: Props) {
  const uniqueDomains = Array.from(new Set(result.evidence.map((e) => e.domain.toLowerCase())));
  const checked = new Date(result.checkedAt);

  return (
    <aside className="lg:sticky lg:top-16 space-y-3 self-start">
      {/* Confidence */}
      <div className="card p-3 space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Confidence</div>
        <div className="flex items-baseline gap-2">
          <span className={`text-base font-bold ${confidenceColor(result.confidence.level)}`}>
            {result.confidence.level.charAt(0).toUpperCase() + result.confidence.level.slice(1)}
          </span>
          <span className="text-[12px] text-ink-dim">· {result.confidence.score}/100</span>
        </div>
        <p className="text-[12px] text-ink-body leading-relaxed">
          {result.confidence.rationale}
        </p>
      </div>

      {/* Sources used */}
      <div className="card p-3 space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">
          Sources used ({uniqueDomains.length})
        </div>
        {uniqueDomains.length === 0 ? (
          <div className="text-[12px] text-ink-dim">No sources returned.</div>
        ) : (
          <ul className="space-y-0.5 text-[12px]">
            {uniqueDomains.slice(0, 10).map((d) => (
              <li key={d} className="text-ink-body truncate font-mono-tight">{d}</li>
            ))}
            {uniqueDomains.length > 10 && (
              <li className="text-ink-dim">+ {uniqueDomains.length - 10} more</li>
            )}
          </ul>
        )}
      </div>

      {/* API origin */}
      <div className="card p-3 space-y-1.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Where data came from</div>
        <ul className="space-y-1 text-[12px]">
          {(Object.keys(API_LABELS) as (keyof CheckResult["apiStatus"])[]).map((api) => (
            <li key={api} className="flex items-center gap-2">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor(result.apiStatus[api])}`} aria-hidden="true" />
              <span className="text-ink-body flex-1">{API_LABELS[api]}</span>
              <span className="text-ink-dim text-[11px]">{stateLabel(result.apiStatus[api])}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 pt-1 border-t border-line-soft">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-verdict-green" aria-hidden="true" />
            <span className="text-ink-body flex-1">Local source rules</span>
            <span className="text-ink-dim text-[11px]">always on</span>
          </li>
        </ul>
      </div>

      {/* Last checked */}
      <div className="card p-3 space-y-0.5">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Last checked</div>
        <time
          dateTime={result.checkedAt}
          className="text-[12px] text-ink-body font-mono-tight"
          title={result.checkedAt}
        >
          {checked.toLocaleString()}
        </time>
      </div>

      {/* Missing evidence */}
      {result.missingSignals.length > 0 && (
        <div className="card p-3 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-verdict-amber">Missing evidence</div>
          <ul className="text-[12px] space-y-1 text-ink-body">
            {result.missingSignals.map((m) => (
              <li key={m.id} className="leading-snug">· {m.text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Share */}
      <div className="card p-3 space-y-2">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Share this result</div>
        <ShareMenu result={result} />
      </div>

      {/* Report issue */}
      <div className="card p-3">
        <ReportIssueButton result={result} />
      </div>

      {/* Links */}
      <div className="text-[12px] text-ink-muted space-y-1 pl-1">
        <div>
          <Link href="/how-it-works" className="text-link hover:underline">How this works ↗</Link>
        </div>
        <div>
          <Link href="/limitations" className="text-link hover:underline">Limitations of this tool ↗</Link>
        </div>
      </div>
    </aside>
  );
}
