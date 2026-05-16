"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { verdictLabel } from "@/lib/scoring";

interface Props { result: CheckResult; }

const ISSUE_REASONS = [
  "Incorrect verdict label",
  "A source is missing or wrong",
  "The Source Quality Score seems off",
  "Spoofing / unsafe URL not flagged",
  "Other",
];

export default function ReportIssueButton({ result }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(ISSUE_REASONS[0]);
  const [notes, setNotes] = useState("");

  function buildMailto(): string {
    const body =
`Reason: ${reason}

Notes:
${notes || "(none)"}

— Auto-included context (please keep, helps the maintainer reproduce) —
Input:      ${result.input}
Mode:       ${result.mode}
Depth:      ${result.depth}
Verdict:    ${verdictLabel(result.evidenceVerdict)} (${result.evidenceVerdict})
Score:      ${result.sourceQualityScore ?? "—"}/100
Confidence: ${result.confidence.level}
Checked at: ${result.checkedAt}
Evidence:   ${result.evidence.length} items from ${new Set(result.evidence.map(e => e.domain)).size} domains
`;
    const subject = `[SourceCheck] ${reason} — "${result.input.slice(0, 60)}"`;
    return `mailto:reports@example.invalid?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-ink-muted hover:text-brand"
      >
        {open ? "Cancel" : "Report an issue with this result"}
      </button>
      {open && (
        <div className="card p-3 space-y-2 text-[13px]">
          <label className="block">
            <span className="text-[12px] text-ink-muted">What's wrong?</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full mt-1 px-2 py-1.5 border border-line rounded bg-page text-ink"
            >
              {ISSUE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] text-ink-muted">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="block w-full mt-1 px-2 py-1.5 border border-line rounded bg-page text-ink resize-none"
              placeholder="What did you expect to see instead?"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-dim">
              Opens your email client. We pre-fill diagnostic context — review before sending.
            </span>
            <a
              href={buildMailto()}
              className="bg-brand hover:bg-brand-hover text-white text-[12px] px-3 py-1.5 rounded no-underline"
            >
              Send report →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
