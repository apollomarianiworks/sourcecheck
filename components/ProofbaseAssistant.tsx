"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import type { ProofbaseAIResponse, ProofbaseAssistantMode } from "@/lib/ai/types";
import { MODE_LABELS } from "@/lib/ai/prompts";

const MODES: ProofbaseAssistantMode[] = [
  "research-assistant",
  "debate-coach",
  "source-analyst",
  "social-claim-analyst",
  "definition-context",
  "argument-builder",
  "routine-agent-planner",
];

export default function ProofbaseAssistant({ result }: { result: CheckResult }) {
  const [mode, setMode] = useState<ProofbaseAssistantMode>("research-assistant");
  const [question, setQuestion] = useState("Summarize this result and what I should check next.");
  const [response, setResponse] = useState<ProofbaseAIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question, checkResult: result }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Assistant failed.");
      setResponse(json as ProofbaseAIResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Proofbase AI</div>
          <div className="text-[14px] font-bold text-ink">Evidence-grounded assistant</div>
        </div>
        <span className="text-[11px] text-ink-dim border border-line-soft rounded px-2 py-0.5">rule-based fallback</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ProofbaseAssistantMode)}
          className="border border-line rounded bg-page px-2 py-2 text-[13px] text-ink"
          aria-label="Assistant mode"
        >
          {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
        </select>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="border border-line rounded bg-page px-2 py-2 text-[13px] text-ink"
          placeholder="Ask for a grounded summary, brief, or next checks"
        />
      </div>

      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="bg-brand text-white hover:bg-brand-hover disabled:opacity-50 text-[13px] px-3 py-2 rounded"
      >
        {loading ? "Building grounded answer..." : "Ask assistant"}
      </button>

      {error && <div className="text-[12px] text-verdict-red">{error}</div>}

      {response && (
        <div className="space-y-3 border-t border-line-soft pt-3">
          <p className="text-[13px] text-ink-body leading-relaxed">{response.answerSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Evidence used</div>
              {response.evidenceUsed.length > 0 ? (
                <ul className="space-y-1.5">
                  {response.evidenceUsed.slice(0, 5).map((item) => (
                    <li key={item.url} className="text-[12px]">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-link hover:underline">{item.publisher}: {item.title}</a>
                      <div className="text-ink-dim">{item.note}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12px] text-ink-muted">No linked evidence was supplied.</div>
              )}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Next checks</div>
              <ul className="list-disc pl-5 text-[12px] text-ink-body space-y-1">
                {response.suggestedNextChecks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
          <div className="text-[12px] text-ink-muted">
            Confidence: <strong>{response.confidenceLevel}</strong>. {response.limitations[0]}
          </div>
        </div>
      )}
    </div>
  );
}
