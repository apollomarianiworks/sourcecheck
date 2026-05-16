"use client";

import { useState } from "react";
import { createClaim, attachSourceMeshSummary, ClientError, type SourceMeshSnapshot } from "@/lib/community/firestore";
import {
  checkDuplicateContent,
  checkRepeatedLinks,
  recordContentFingerprint,
  recordLinkFingerprints,
} from "@/lib/community/restrictions";
import { trackProofmediaEvent } from "@/lib/proofmedia/analytics";
import {
  ALLOWED_CATEGORIES, ALLOWED_VISIBILITIES,
  MAX_BODY_LENGTH, MAX_EVIDENCE_LINKS, MAX_TAGS, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH,
  validateClaim,
  type ClaimCategoryId, type ClaimVisibility,
} from "@/lib/community/validation";

interface Props {
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  onCreated: (id: string) => void;
  onCancel: () => void;
}

const CATEGORY_LABEL: Record<ClaimCategoryId, string> = {
  "politics-news":    "Politics & news",
  "health-medical":   "Health & medical",
  "science-research": "Science & research",
  "legal-court":      "Legal & courts",
  "finance-business": "Finance & business",
  "technology":       "Technology",
  "celebrity-viral":  "Celebrity & viral",
  "general":          "General",
};

export default function ClaimComposer({ authorUsername, authorDisplayName, authorPhotoURL, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody]   = useState("");
  const [category, setCategory] = useState<ClaimCategoryId>("general");
  const [tagsInput, setTagsInput] = useState("");
  const [evidenceInput, setEvidenceInput] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ClaimVisibility>("public");
  const [runMesh, setRunMesh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const tags = parseTags(tagsInput);
  const unsupportedDraft = evidenceUrls.length === 0;

  function addEvidenceUrl() {
    const u = evidenceInput.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) { setError("Evidence URLs must start with http(s)://"); return; }
    if (evidenceUrls.length >= MAX_EVIDENCE_LINKS) { setError(`Max ${MAX_EVIDENCE_LINKS} evidence links per claim.`); return; }
    if (evidenceUrls.includes(u)) { setError("That URL is already attached."); return; }
    setEvidenceUrls([...evidenceUrls, u]);
    setEvidenceInput("");
    setError(null);
  }

  function removeEvidence(u: string) {
    setEvidenceUrls(evidenceUrls.filter((x) => x !== u));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validateClaim({ title, body, category, tags, evidenceUrls, visibility });
    if (!v.ok) { setError(v.message ?? "Invalid claim."); return; }
    const duplicate = checkDuplicateContent("claim", `${title}\n${body}`);
    if (!duplicate.allowed) { setError(duplicate.reason ?? "Duplicate content blocked."); return; }
    const repeatedLinks = checkRepeatedLinks(evidenceUrls);
    if (!repeatedLinks.allowed) { setError(repeatedLinks.reason ?? "Repeated links blocked."); return; }

    setBusy(true);
    setProgress("Saving…");
    try {
      const id = await createClaim(
        { title, body, category, tags, evidenceUrls, visibility },
        { authorUsername, authorDisplayName, authorPhotoURL },
      );

      if (runMesh && visibility === "public") {
        try {
          setProgress("Running SourceMesh…");
          const res = await fetch("/api/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "claim", input: title, depth: "quick" }),
          });
          if (res.ok) {
            const data = await res.json();
            const snap: SourceMeshSnapshot = {
              verdict: data.evidenceVerdict ?? "none",
              sourceQualityScore: data.sourceQualityScore ?? null,
              confidenceLevel: data.confidence?.level ?? "insufficient",
              coverageLevel: data.coverageLevel ?? "low",
              category: data.claimCategory ?? category,
              adaptersOk: Array.isArray(data.sourceCoverage)
                ? (data.sourceCoverage as { status: string; itemCount: number }[]).filter((c) => c.status === "ok" && c.itemCount > 0).length
                : 0,
              evidenceCount: Array.isArray(data.evidence) ? data.evidence.length : 0,
              checkedAt: data.checkedAt ?? new Date().toISOString(),
            };
            await attachSourceMeshSummary(id, snap);
          }
        } catch {
          // SourceMesh is optional — never block the post on its failure.
        }
      }

      recordContentFingerprint("claim", `${title}\n${body}`);
      recordLinkFingerprints(evidenceUrls);
      trackProofmediaEvent("post_created", {
        category,
        evidenceCount: evidenceUrls.length,
        sourceMeshRequested: runMesh,
      });
      onCreated(id);
    } catch (e) {
      if (e instanceof ClientError) setError(e.message);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold text-ink">New claim</h2>
        <button type="button" onClick={onCancel} className="text-[12px] text-ink-muted hover:text-ink">Cancel</button>
      </div>

      <Field label={`Title (${title.length}/${MAX_TITLE_LENGTH})`} hint={`Required. ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} characters.`}>
        <input
          type="text" required minLength={MIN_TITLE_LENGTH} maxLength={MAX_TITLE_LENGTH}
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Did the SEC fine Y for X in 2024?"'
          className="w-full px-2 py-1.5 border border-line rounded text-[14px]"
        />
      </Field>

      <Field label={`Body (${body.length}/${MAX_BODY_LENGTH})`} hint="Optional context, but more specifics → better SourceMesh results.">
        <textarea
          rows={4} maxLength={MAX_BODY_LENGTH} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Background, framing, or the exact wording you want checked."
          className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Category" hint="Routes the claim to the right adapters.">
          <select
            value={category} onChange={(e) => setCategory(e.target.value as ClaimCategoryId)}
            className="w-full px-2 py-1.5 border border-line rounded text-[14px]"
          >
            {ALLOWED_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
        <Field label="Visibility">
          <select
            value={visibility} onChange={(e) => setVisibility(e.target.value as ClaimVisibility)}
            className="w-full px-2 py-1.5 border border-line rounded text-[14px]"
          >
            {ALLOWED_VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </div>

      <Field label={`Tags (${tags.length}/${MAX_TAGS})`} hint="Comma- or space-separated. a-z, 0-9, dashes.">
        <input
          type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
          placeholder="elections politics ai-claims"
          className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
        />
      </Field>

      <Field label={`Evidence URLs (${evidenceUrls.length}/${MAX_EVIDENCE_LINKS})`} hint={`Optional but recommended. Up to ${MAX_EVIDENCE_LINKS} links.`}>
        <div className="flex gap-1.5">
          <input
            type="url" value={evidenceInput} onChange={(e) => setEvidenceInput(e.target.value)}
            placeholder="https://example.com/article"
            className="flex-1 px-2 py-1.5 border border-line rounded text-[13px]"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEvidenceUrl(); } }}
          />
          <button type="button" onClick={addEvidenceUrl} className="text-[12px] bg-section hover:bg-line-soft px-3 py-1.5 rounded border border-line">
            Add
          </button>
        </div>
        {evidenceUrls.length > 0 && (
          <ul className="space-y-1 mt-1.5">
            {evidenceUrls.map((u) => (
              <li key={u} className="flex items-center gap-2 text-[12px] text-ink-body">
                <span className="truncate flex-1 font-mono text-[11.5px]">{u}</span>
                <button type="button" onClick={() => removeEvidence(u)} className="text-ink-dim hover:text-verdict-red">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {unsupportedDraft && (
        <div className="rounded border border-verdict-amberSoft bg-verdict-amberSoft/40 p-2 text-[12px] text-verdict-amber">
          Soft warning: unsupported claims are allowed as questions or evidence requests, but they are weaker. Add a primary source, article, court record, agency page, study, or social URL when you can.
        </div>
      )}

      <label className="flex items-center gap-2 text-[12.5px] text-ink-body">
        <input type="checkbox" checked={runMesh} onChange={(e) => setRunMesh(e.target.checked)} />
        Run SourceMesh analysis after publishing (best-effort; never blocks posting).
      </label>

      {error && <div className="text-[12px] text-verdict-red">{error}</div>}
      {progress && <div className="text-[12px] text-ink-muted">{progress}</div>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-[13px] px-3 py-1.5 rounded border border-line hover:bg-section">Cancel</button>
        <button
          type="submit" disabled={busy}
          className="text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded disabled:opacity-50"
        >
          {busy ? "Posting…" : "Publish claim"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[11.5px] text-ink-muted uppercase tracking-wide">{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] text-ink-dim">{hint}</span>}
    </label>
  );
}

function parseTags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}
