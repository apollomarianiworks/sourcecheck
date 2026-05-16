"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClaimStore } from "@/lib/proofmedia/store";
import type { ClaimThread, EvidenceAttachment, Rebuttal, ContextNote, ContextNoteKind, StanceLabel } from "@/lib/proofmedia/types";
import { uniqueId } from "@/lib/proofmedia/slug";
import { getLocalAccount } from "@/lib/auth/local";
import ClaimPostCard from "@/components/proofmedia/ClaimPostCard";
import EvidenceAttachmentCard from "@/components/proofmedia/EvidenceAttachmentCard";
import RebuttalCard from "@/components/proofmedia/RebuttalCard";
import ContextNoteCard from "@/components/proofmedia/ContextNoteCard";
import SaveCollectionButton from "@/components/proofmedia/SaveCollectionButton";
import CommunitySidebar from "@/components/proofmedia/CommunitySidebar";
import LocalModeBanner from "@/components/proofmedia/LocalModeBanner";
import EmptyState from "@/components/proofmedia/EmptyState";

interface Props { claimId: string; }

export default function ClaimThreadView({ claimId }: Props) {
  const [claim, setClaim] = useState<ClaimThread | null>(null);
  const [mounted, setMounted] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { setClaim(ClaimStore.get(claimId)); setMounted(true); }, [claimId]);

  function save(next: ClaimThread) {
    ClaimStore.upsert(next);
    setClaim(next);
  }

  async function runSourceMesh() {
    if (!claim) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "claim", input: claim.title, depth: "quick" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const next: ClaimThread = {
        ...claim,
        sourceMeshSummary: {
          verdict: data.evidenceVerdict,
          sourceQualityScore: data.sourceQualityScore ?? null,
          confidenceLevel: data.confidence?.level ?? "insufficient",
          coverageLevel: data.coverageLevel ?? "low",
          category: data.claimCategory ?? "general",
          adaptersOk: (data.sourceCoverage ?? []).filter((c: { status: string; itemCount: number }) => c.status === "ok" && c.itemCount > 0).length,
          evidenceCount: (data.evidence ?? []).length,
          checkedAt: data.checkedAt ?? new Date().toISOString(),
          warnings: data.warnings ?? [],
        },
        owner: { ...claim.owner, updatedAt: new Date().toISOString() },
      };
      save(next);
    } catch (e) {
      alert(`Could not run SourceMesh: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateAiSummary() {
    if (!claim) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: claim.title,
          intent: "summarize-claim",
          evidence: claim.evidence.map((e) => ({
            title: e.title,
            url: e.url,
            publisher: e.publisher,
            domain: e.publisherDomain,
            snippet: e.snippet,
            stance: e.stance,
            score: e.sourceQualityScore,
            date: e.publishedAt,
          })),
        }),
      });
      const data = await res.json();
      setAiSummary(data.summary?.text ?? data.text ?? data.error ?? "No summary available.");
    } catch (e) {
      setAiSummary(`Could not generate summary: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  }

  if (!mounted) return <div className="text-ink-dim text-[13px]">Loading…</div>;
  if (!claim) {
    return (
      <EmptyState
        icon="¿"
        title="Claim not found"
        body="This claim doesn't exist in your local browser storage. It may have been deleted or it lives on a different device."
        cta={{ href: "/community", label: "Back to community →" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 lg:gap-8">
      <div className="space-y-5 min-w-0">
        <LocalModeBanner />

        <div className="flex items-center gap-2 text-[12px]">
          <Link href="/community" className="text-link hover:underline">← Back to feed</Link>
          <span className="text-ink-dim">·</span>
          <span className="text-ink-muted">Claim thread</span>
          <span className="ml-auto"><SaveCollectionButton claimId={claim.id} defaultCollectionName="Saved claims" /></span>
        </div>

        <ClaimPostCard claim={claim} variant="full" />

        {/* SourceMesh summary */}
        <section className="card p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-[14px] font-bold text-ink">SourceMesh analysis</h2>
            <button
              type="button"
              onClick={runSourceMesh}
              disabled={aiLoading}
              className="text-[12px] px-3 py-1 rounded border border-line hover:bg-section disabled:opacity-50"
            >
              {claim.sourceMeshSummary ? "Re-run" : "Run analysis"}
            </button>
          </div>
          {claim.sourceMeshSummary ? (
            <SourceMeshBlock summary={claim.sourceMeshSummary} />
          ) : (
            <p className="text-[12.5px] text-ink-muted leading-relaxed">
              SourceMesh hasn&apos;t been run for this claim yet. Click <strong>Run analysis</strong> to fan out across
              GDELT, Wikipedia, fact-checkers, and academic sources — the result is saved with the claim.
            </p>
          )}
        </section>

        {/* AI summary */}
        <section className="card p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-[14px] font-bold text-ink">Assistant summary</h2>
            <button
              type="button"
              onClick={generateAiSummary}
              disabled={aiLoading || claim.evidence.length === 0}
              className="text-[12px] px-3 py-1 rounded border border-line hover:bg-section disabled:opacity-50"
              title={claim.evidence.length === 0 ? "Attach at least one source first" : "Generate a source-grounded summary"}
            >
              {aiLoading ? "Generating…" : "Generate"}
            </button>
          </div>
          {aiSummary ? (
            <div className="text-[13.5px] text-ink-body leading-relaxed whitespace-pre-line">{aiSummary}</div>
          ) : (
            <p className="text-[12.5px] text-ink-muted">
              The assistant only summarises evidence you&apos;ve actually attached. Add sources first.
            </p>
          )}
        </section>

        {/* Evidence */}
        <Section title={`Evidence (${claim.evidence.length})`}>
          {claim.evidence.length === 0 ? (
            <div className="text-[13px] text-ink-muted">No evidence attached yet. Use the form below to add a URL.</div>
          ) : (
            <ul className="space-y-2">
              {claim.evidence.map((e) => <li key={e.id}><EvidenceAttachmentCard evidence={e} /></li>)}
            </ul>
          )}
          <AddEvidenceForm
            onAdd={(ev) => save({ ...claim, evidence: [ev, ...claim.evidence], owner: { ...claim.owner, updatedAt: new Date().toISOString() } })}
          />
        </Section>

        {/* Rebuttals */}
        <Section title={`Rebuttals (${claim.rebuttals.length})`}>
          {claim.rebuttals.length === 0 ? (
            <div className="text-[13px] text-ink-muted">No rebuttals yet.</div>
          ) : (
            <ul className="space-y-2.5">{claim.rebuttals.map((r) => <li key={r.id}><RebuttalCard rebuttal={r} /></li>)}</ul>
          )}
          <AddRebuttalForm
            onAdd={(r) => save({ ...claim, rebuttals: [...claim.rebuttals, r], owner: { ...claim.owner, updatedAt: new Date().toISOString() } })}
          />
        </Section>

        {/* Context notes */}
        <Section title={`Context notes (${claim.contextNotes.length})`}>
          {claim.contextNotes.length === 0 ? (
            <div className="text-[13px] text-ink-muted">No context notes yet.</div>
          ) : (
            <ul className="space-y-2.5">{claim.contextNotes.map((n) => <li key={n.id}><ContextNoteCard note={n} /></li>)}</ul>
          )}
          <AddContextNoteForm
            onAdd={(n) => save({ ...claim, contextNotes: [...claim.contextNotes, n], owner: { ...claim.owner, updatedAt: new Date().toISOString() } })}
          />
        </Section>

        {/* Limitations */}
        <div className="text-[12px] text-ink-dim border-t border-line-soft pt-3 leading-relaxed">
          ProofMedia threads are local-first. Posts, rebuttals, and notes save to this browser only.
          Every evidence card must have a real URL — fabricated citations are not accepted by the forms.
        </div>
      </div>

      <CommunitySidebar />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SourceMeshBlock({ summary: s }: { summary: NonNullable<ClaimThread["sourceMeshSummary"]> }) {
  return (
    <ul className="text-[12.5px] text-ink-body space-y-0.5">
      <li><strong>Verdict:</strong> {s.verdict}</li>
      <li><strong>Source Quality Score:</strong> {s.sourceQualityScore ?? "—"}/100</li>
      <li><strong>Confidence:</strong> {s.confidenceLevel}</li>
      <li><strong>Coverage:</strong> {s.coverageLevel} ({s.adaptersOk} adapters returned items)</li>
      <li><strong>Category:</strong> {s.category}</li>
      <li><strong>Evidence found:</strong> {s.evidenceCount}</li>
      <li className="text-ink-dim">Checked {s.checkedAt.slice(0, 16).replace("T", " ")}</li>
    </ul>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Forms
// ──────────────────────────────────────────────────────────────────────────

function AddEvidenceForm({ onAdd }: { onAdd: (e: EvidenceAttachment) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [stance, setStance] = useState<StanceLabel>("context");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//.test(url.trim())) {
      setError("URL must start with http:// or https://"); return;
    }
    setBusy(true); setError(null);
    let host: string | null = null;
    try { host = new URL(url.trim()).hostname.replace(/^www\./, ""); } catch { /* ignore */ }

    // Run the safe extractor to fill metadata. This is the SAME endpoint
    // used elsewhere and applies the full SSRF guard.
    let extracted: { title?: string | null; siteName?: string | null; author?: string | null; publishedAt?: string | null; description?: string | null } = {};
    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (res.ok) extracted = await res.json();
    } catch { /* offline / network — fall back to user-entered title */ }

    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    onAdd({
      id: uniqueId("ev"),
      url: url.trim(),
      type: "article",
      title: (title.trim() || extracted.title || url.trim()).slice(0, 220),
      publisher: extracted.siteName ?? host,
      publisherDomain: host,
      publishedAt: extracted.publishedAt ?? null,
      snippet: (extracted.description ?? "").slice(0, 320),
      stance,
      whyItMatters: null,
      sourceCategory: null,
      sourceQualityScore: null,
      warningFlags: [],
      limitations: [],
      addedAt: stamp,
      addedBy: account?.username ?? "you",
    });
    setUrl(""); setTitle(""); setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card p-3 space-y-1.5">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Attach evidence</div>
      <input
        type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="https://… (article, study, gov page, court filing)"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      />
      <div className="flex items-center gap-1.5">
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional — auto-extracted)"
          className="flex-1 px-2 py-1.5 border border-line rounded text-[13px]"
        />
        <select
          value={stance} onChange={(e) => setStance(e.target.value as StanceLabel)}
          className="px-2 py-1.5 border border-line rounded text-[13px]"
        >
          <option value="supports">Supports</option>
          <option value="disputes">Disputes</option>
          <option value="context">Context</option>
          <option value="unclear">Unclear</option>
        </select>
        <button
          type="submit" disabled={busy || !url.trim()}
          className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <div className="text-[12px] text-verdict-red">{error}</div>}
      <div className="text-[11px] text-ink-dim">
        We fetch metadata via the safe extractor (SSRF-guarded, 2 MB cap). The link is the canonical reference.
      </div>
    </form>
  );
}

function AddRebuttalForm({ onAdd }: { onAdd: (r: Rebuttal) => void }) {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5)        { setError("Rebuttal body required."); return; }
    if (!/^https?:\/\//.test(url.trim())) { setError("Rebuttals must cite at least one source URL."); return; }
    setError(null);
    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    let host: string | null = null;
    try { host = new URL(url.trim()).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    const ev: EvidenceAttachment = {
      id: uniqueId("ev"), url: url.trim(), type: "article", title: url.trim(),
      publisher: host, publisherDomain: host,
      publishedAt: null, snippet: "", stance: "disputes", whyItMatters: null,
      sourceCategory: null, sourceQualityScore: null,
      warningFlags: [], limitations: [], addedAt: stamp, addedBy: account?.username ?? "you",
    };
    onAdd({
      id: uniqueId("reb"), body: body.trim(), evidence: [ev],
      owner: { authorUsername: account?.username ?? "you", authorDisplayName: account?.displayName ?? "You", createdAt: stamp, updatedAt: stamp },
      votes: { up: 0, down: 0, net: 0 },
    });
    setBody(""); setUrl("");
  }

  return (
    <form onSubmit={submit} className="card p-3 space-y-1.5">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Add a rebuttal</div>
      <textarea
        rows={3} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Counter-argument — must cite a source."
        className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
      />
      <input
        type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="Supporting source URL"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      />
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-[12px] text-verdict-red mr-auto">{error}</span>}
        <button
          type="submit"
          className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded"
        >
          Post rebuttal
        </button>
      </div>
    </form>
  );
}

function AddContextNoteForm({ onAdd }: { onAdd: (n: ContextNote) => void }) {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ContextNoteKind>("missing-context");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5)            { setError("Context note body required."); return; }
    if (!/^https?:\/\//.test(url.trim()))  { setError("Notes must attach at least one source URL."); return; }
    setError(null);
    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    let host: string | null = null;
    try { host = new URL(url.trim()).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    const ev: EvidenceAttachment = {
      id: uniqueId("ev"), url: url.trim(), type: "article", title: url.trim(),
      publisher: host, publisherDomain: host,
      publishedAt: null, snippet: "", stance: "context", whyItMatters: null,
      sourceCategory: null, sourceQualityScore: null,
      warningFlags: [], limitations: [], addedAt: stamp, addedBy: account?.username ?? "you",
    };
    onAdd({
      id: uniqueId("note"), kind, body: body.trim(), evidence: [ev],
      confidence: "medium", visibilityScore: 50,
      owner: { authorUsername: account?.username ?? "you", authorDisplayName: account?.displayName ?? "You", createdAt: stamp, updatedAt: stamp },
    });
    setBody(""); setUrl("");
  }

  return (
    <form onSubmit={submit} className="card p-3 space-y-1.5">
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Add a context note</div>
      <select
        value={kind} onChange={(e) => setKind(e.target.value as ContextNoteKind)}
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      >
        <option value="missing-context">Missing context</option>
        <option value="timeline-clarification">Timeline clarification</option>
        <option value="source-warning">Source warning</option>
        <option value="misleading-framing">Misleading framing</option>
        <option value="correction">Correction</option>
        <option value="follow-up-evidence">Follow-up evidence</option>
      </select>
      <textarea
        rows={3} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="What context is missing? Be specific."
        className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
      />
      <input
        type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="Source URL backing this note"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      />
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-[12px] text-verdict-red mr-auto">{error}</span>}
        <button
          type="submit"
          className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded"
        >
          Post note
        </button>
      </div>
    </form>
  );
}
