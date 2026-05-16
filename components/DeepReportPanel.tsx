"use client";

import { useMemo, useState } from "react";
import type { DeepReport, EvidenceItem, CheckResult } from "@/lib/types";
import { reportToMarkdown } from "@/lib/research-summary";

interface Props {
  report: DeepReport;
  evidence: EvidenceItem[];
  result: CheckResult;
}

export default function DeepReportPanel({ report, evidence, result }: Props) {
  return (
    <div className="space-y-5 border-2 border-phosphor-amber p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-phosphor-amber glow-amber text-sm tracking-widest">
          ▼ DEEP SCAN REPORT ▼
        </span>
        <ReportClipboard report={report} result={result} evidence={evidence} />
      </div>

      <Headline text={report.researchSummary.headline} />

      <ClaimBreakdown bd={report.claimBreakdown} />

      <TimelineSection timeline={report.timeline} />

      <CorroborationSection
        evidence={evidence}
        corroborating={report.corroborating}
        conflicting={report.conflicting}
      />

      <StrongestWeakestSection
        strongest={report.researchSummary.strongest}
        weakest={report.researchSummary.weakest}
      />

      <SummaryBody body={report.researchSummary.body} />

      <ListSection
        title="RELIABILITY NOTES"
        items={report.researchSummary.reliabilityNotes}
        tone="neutral"
      />

      <ListSection
        title="LIMITATIONS"
        items={report.researchSummary.limitations}
        tone="warn"
      />
    </div>
  );
}

function Headline({ text }: { text: string }) {
  return (
    <div className="border border-amber-700 bg-amber-950/10 p-3">
      <div className="text-[10px] tracking-widest text-amber-700 mb-1">HEADLINE FINDING</div>
      <div className="text-sm text-phosphor-amber glow-amber leading-relaxed">{text}</div>
    </div>
  );
}

function ClaimBreakdown({ bd }: { bd: DeepReport["claimBreakdown"] }) {
  if (bd.parts.length === 0) {
    return (
      <Section title="CLAIM BREAKDOWN">
        <div className="text-xs text-green-800">
          No structured parts detected — claim is short or non-specific.
        </div>
      </Section>
    );
  }
  return (
    <Section title="CLAIM BREAKDOWN">
      <ul className="space-y-1 text-xs">
        {bd.parts.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-green-700 tracking-widest shrink-0 w-24">{p.label.toUpperCase()}</span>
            <span className="text-green-500 flex-1">{p.value}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TimelineSection({ timeline }: { timeline: DeepReport["timeline"] }) {
  if (timeline.totalDatedItems === 0) {
    return (
      <Section title="EVIDENCE TIMELINE">
        <div className="text-xs text-green-800">No dated items to plot.</div>
      </Section>
    );
  }
  const maxCount = Math.max(...timeline.buckets.map((b) => b.count));
  return (
    <Section title={`EVIDENCE TIMELINE (${timeline.granularity}, ${timeline.totalDatedItems} dated items)`}>
      <div className="space-y-1">
        {timeline.buckets.map((b, i) => {
          const width = Math.max(2, Math.round((b.count / maxCount) * 100));
          return (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="text-green-700 font-mono w-20 shrink-0">{b.period}</span>
              <div className="flex-1 bg-green-950 h-3 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-phosphor-green"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-phosphor-green font-mono w-8 text-right shrink-0">{b.count}</span>
            </div>
          );
        })}
      </div>
      {timeline.earliestDate && timeline.latestDate && (
        <div className="text-[10px] text-green-800 mt-2">
          Span: {timeline.earliestDate} → {timeline.latestDate}
        </div>
      )}
    </Section>
  );
}

function CorroborationSection({
  evidence,
  corroborating,
  conflicting,
}: {
  evidence: EvidenceItem[];
  corroborating: number[];
  conflicting: number[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SignalList
        title="TOP CORROBORATING SOURCES"
        tone="good"
        items={corroborating.map((i) => evidence[i]).filter(Boolean)}
        emptyText="No corroborating sources at Tier B or above."
      />
      <SignalList
        title="CONFLICTING SOURCES"
        tone="bad"
        items={conflicting.map((i) => evidence[i]).filter(Boolean)}
        emptyText="No fact-checks gave conflicting verdicts."
      />
    </div>
  );
}

function SignalList({
  title,
  tone,
  items,
  emptyText,
}: {
  title: string;
  tone: "good" | "bad";
  items: EvidenceItem[];
  emptyText: string;
}) {
  const accent = tone === "good" ? "text-phosphor-green border-green-800" : "text-phosphor-red border-red-800";
  return (
    <div className={`border ${accent} p-3`}>
      <div className={`text-[10px] tracking-widest mb-2 ${accent}`}>{title}</div>
      {items.length === 0 ? (
        <div className="text-[11px] text-green-800">{emptyText}</div>
      ) : (
        <ul className="space-y-2 text-[11px]">
          {items.map((it, i) => (
            <li key={i}>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-phosphor-green hover:underline block truncate"
              >
                {it.title}
              </a>
              <div className="text-green-800 flex justify-between">
                <span>{it.publisher}</span>
                <span className="font-mono">{it.domainScore ?? "—"}/100</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StrongestWeakestSection({
  strongest,
  weakest,
}: {
  strongest: string[];
  weakest: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <BulletList title="STRONGEST EVIDENCE" items={strongest} tone="good" />
      <BulletList title="WEAKEST EVIDENCE"   items={weakest}   tone="warn" />
    </div>
  );
}

function SummaryBody({ body }: { body: string }) {
  return (
    <Section title="FULL ANALYSIS">
      <div className="space-y-3 text-sm text-green-500 leading-relaxed">
        {body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </Section>
  );
}

function ListSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "neutral" | "warn";
}) {
  if (items.length === 0) return null;
  const accent = tone === "warn" ? "text-phosphor-amber" : "text-phosphor-cyan";
  return (
    <Section title={title}>
      <ul className={`space-y-1 text-[11px] ${accent}`}>
        {items.map((it, i) => (
          <li key={i}>· {it}</li>
        ))}
      </ul>
    </Section>
  );
}

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "warn";
}) {
  const accent = tone === "good" ? "border-green-800 text-phosphor-green" : "border-amber-800 text-phosphor-amber";
  return (
    <div className={`border ${accent} p-3`}>
      <div className={`text-[10px] tracking-widest mb-2 ${accent}`}>{title}</div>
      {items.length === 0 ? (
        <div className="text-[11px] text-green-800">No items with credibility scores.</div>
      ) : (
        <ul className="space-y-1 text-[11px] text-green-600">
          {items.map((it, i) => (
            <li key={i}>· {it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-green-700 tracking-widest">{title}</div>
      {children}
    </div>
  );
}

function ReportClipboard({
  report,
  result,
  evidence,
}: {
  report: DeepReport;
  result: CheckResult;
  evidence: EvidenceItem[];
}) {
  const [copied, setCopied] = useState<"idle" | "ok" | "err">("idle");

  const text = useMemo(
    () =>
      reportToMarkdown({
        input: result.input,
        mode: result.mode,
        verdict: result.evidenceVerdict,
        evidence,
        sourceQualityScore: result.sourceQualityScore,
        claimLabels: result.claimLabels,
        apiStatus: result.apiStatus,
        summary: {
          headline: report.researchSummary.headline,
          body: report.researchSummary.body,
          strongest: report.researchSummary.strongest,
          weakest: report.researchSummary.weakest,
          reliabilityNotes: report.researchSummary.reliabilityNotes,
          limitations: report.researchSummary.limitations,
        },
      }),
    [report, result, evidence]
  );

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied("ok");
    } catch {
      setCopied("err");
    } finally {
      setTimeout(() => setCopied("idle"), 2000);
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = result.checkedAt.replace(/[:.]/g, "-");
    a.href = url;
    a.download = `deep-report-${result.mode}-${ts}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const label =
    copied === "ok"  ? "✓ COPIED"      :
    copied === "err" ? "✗ FAIL"        :
                       "⧉ COPY REPORT";

  return (
    <div className="flex gap-2">
      <button
        onClick={copy}
        className="border border-amber-700 text-phosphor-amber hover:bg-amber-950/30 px-3 py-1 text-[10px] tracking-widest"
      >
        {label}
      </button>
      <button
        onClick={download}
        className="border border-amber-800 text-amber-600 hover:text-phosphor-amber hover:border-amber-600 px-3 py-1 text-[10px] tracking-widest"
      >
        ↓ DOWNLOAD
      </button>
    </div>
  );
}
