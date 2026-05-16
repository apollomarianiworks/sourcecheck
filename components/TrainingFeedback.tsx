"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import type { TrainingFeedbackKind } from "@/lib/training/types";
import { buildTrainingEvent, logTrainingEvent } from "@/lib/training/log-event";
import { listTrainingEvents } from "@/lib/training/log-event";
import { trainingEventsToJsonl } from "@/lib/training/export-jsonl";

const OPTIONS: { kind: TrainingFeedbackKind; label: string }[] = [
  { kind: "useful", label: "Was this useful?" },
  { kind: "missing-source", label: "Missing source?" },
  { kind: "bad-summary", label: "Bad summary?" },
  { kind: "wrong-category", label: "Wrong category?" },
  { kind: "improve-answer", label: "Improve this answer" },
];

export default function TrainingFeedback({ result }: { result: CheckResult }) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  function submit(kind: TrainingFeedbackKind) {
    const event = buildTrainingEvent(result, kind, note);
    logTrainingEvent(event);
    setSaved("Feedback saved locally for future dataset export.");
  }

  function exportJsonl() {
    const blob = new Blob([trainingEventsToJsonl(listTrainingEvents())], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proofbase-training-${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-3.5 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Training data foundation</div>
        <div className="text-[14px] font-bold text-ink">Help improve future Proofbase AI</div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full border border-line rounded bg-page px-2 py-2 text-[13px]"
        placeholder="Optional correction note. Do not include private info."
      />
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button key={option.kind} type="button" onClick={() => submit(option.kind)} className="text-[12px] border border-line rounded px-2 py-1 hover:bg-section">
            {option.label}
          </button>
        ))}
        <button type="button" onClick={exportJsonl} className="text-[12px] text-brand border border-brand/30 rounded px-2 py-1 hover:bg-brand-soft">
          Export JSONL
        </button>
      </div>
      {saved && <div className="text-[12px] text-verdict-green">{saved}</div>}
      <p className="text-[11px] text-ink-dim">
        Stored locally only. JSONL omits API keys, private user data, and private social content.
      </p>
    </div>
  );
}
