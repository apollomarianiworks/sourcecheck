"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-hook";
import {
  readClaim, readCommentsForClaim, createComment, toggleSave, isSaved, castVote, readMyVote, createReport,
  ClientError, type ClaimDoc, type CommentDoc,
} from "@/lib/community/firestore";
import type { CommentType } from "@/lib/community/validation";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/community/validation";
import Avatar from "@/components/proofmedia/Avatar";

interface Props { claimId: string; }

export default function ClaimThreadView({ claimId }: Props) {
  const { status, profile, user } = useAuth();
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDoc | null>(null);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await readClaim(claimId);
      setClaim(c);
      if (c) {
        const cs = await readCommentsForClaim(claimId);
        setComments(cs);
      }
      if (status === "signed-in") {
        const [s, v] = await Promise.all([
          isSaved("claim", claimId).catch(() => false),
          readMyVote("claim", claimId).catch(() => null),
        ]);
        setSaved(s);
        setMyVote(v);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [claimId, status]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading) return <SkeletonThread />;
  if (error)   return <div className="card p-6 text-[13px] text-verdict-red">{error}</div>;
  if (!claim) {
    return (
      <div className="card p-8 text-center space-y-3">
        <h1 className="text-[18px] font-bold text-ink">Claim not found</h1>
        <p className="text-[13px] text-ink-muted">This claim doesn&apos;t exist or has been removed.</p>
        <Link href="/community" className="inline-block bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded text-[13px] no-underline">Back to feed →</Link>
      </div>
    );
  }

  async function handleSave() {
    if (status !== "signed-in") { router.push(`/login?next=/community/${claimId}`); return; }
    try { const v = await toggleSave("claim", claimId); setSaved(v); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function handleVote(v: "up" | "down") {
    if (status !== "signed-in") { router.push(`/login?next=/community/${claimId}`); return; }
    try { const nv = await castVote("claim", claimId, v); setMyVote(nv); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-8">
      <div className="space-y-4 min-w-0">
        <Link href="/community" className="text-[12px] text-link hover:underline">← Back to feed</Link>

        <article className="card p-4 space-y-3">
          <header className="flex items-center gap-2 text-[12px] text-ink-muted">
            <Avatar name={claim.authorDisplayName} src={claim.authorPhotoURL} size={26} />
            <Link href={`/profile/${claim.authorUsername}`} className="text-ink-body hover:underline font-medium">{claim.authorDisplayName}</Link>
            <span className="text-ink-dim">@{claim.authorUsername}</span>
            <span className="text-ink-dim">· {claim.createdAt.slice(0, 10)}</span>
            <span className="ml-auto px-1.5 py-0.5 rounded bg-section text-ink-body text-[11px]">{claim.category.replace(/-/g, " ")}</span>
          </header>

          <h1 className="text-[22px] font-bold text-ink leading-snug">{claim.title}</h1>
          {claim.body && (
            <p className="text-[14px] text-ink-body whitespace-pre-line leading-relaxed">{claim.body}</p>
          )}

          {claim.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[11px]">
              {claim.tags.map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-section text-ink-body">#{t}</span>)}
            </div>
          )}

          {claim.evidenceUrls.length > 0 && (
            <div className="border-t border-line-soft pt-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Evidence ({claim.evidenceUrls.length})</div>
              <ul className="space-y-1">
                {claim.evidenceUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noopener noreferrer" className="text-link hover:underline text-[12.5px] break-all">{u}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {claim.sourceMeshSummary && (
            <div className="border-t border-line-soft pt-2 text-[12px] text-ink-body">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">SourceMesh analysis</div>
              <ul className="mt-1 space-y-0.5">
                <li><strong>Verdict:</strong> {claim.sourceMeshSummary.verdict}</li>
                <li><strong>Source Quality:</strong> {claim.sourceMeshSummary.sourceQualityScore ?? "—"}/100</li>
                <li><strong>Confidence:</strong> {claim.sourceMeshSummary.confidenceLevel}</li>
                <li><strong>Coverage:</strong> {claim.sourceMeshSummary.coverageLevel} ({claim.sourceMeshSummary.adaptersOk} adapters)</li>
                <li className="text-ink-dim">Checked {claim.sourceMeshSummary.checkedAt.slice(0, 16).replace("T", " ")}</li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-line-soft pt-2.5 text-[12px] flex-wrap">
            <button onClick={() => handleVote("up")}   className={`px-2 py-1 rounded border ${myVote === "up"   ? "border-verdict-green bg-verdict-greenSoft text-verdict-green" : "border-line text-ink-muted hover:bg-section"}`}>▲ Helpful</button>
            <button onClick={() => handleVote("down")} className={`px-2 py-1 rounded border ${myVote === "down" ? "border-verdict-red bg-verdict-redSoft text-verdict-red"     : "border-line text-ink-muted hover:bg-section"}`}>▼ Not helpful</button>
            <button onClick={handleSave} className={`px-2 py-1 rounded border ${saved ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted hover:bg-section"}`}>
              {saved ? "✓ Saved" : "▢ Save"}
            </button>
            <ReportButton claimId={claimId} />
          </div>
        </article>

        {status === "signed-in" && profile && user ? (
          <CommentComposer
            claimId={claimId}
            authorUsername={profile.username}
            authorDisplayName={profile.displayName}
            authorPhotoURL={profile.photoURL}
            onPosted={refresh}
          />
        ) : (
          <div className="card p-3.5 text-[13px] text-ink-muted flex items-center justify-between gap-2">
            <span>Sign in to comment, rebut, or add context.</span>
            <Link href={`/login?next=/community/${claimId}`} className="bg-brand hover:bg-brand-hover text-white px-3 py-1 rounded text-[12px] no-underline">Sign in</Link>
          </div>
        )}

        <section className="space-y-2.5">
          <h2 className="text-[14px] font-bold text-ink">Discussion ({comments.length})</h2>
          {comments.length === 0 ? (
            <div className="text-[13px] text-ink-muted">No comments, rebuttals, or context notes yet.</div>
          ) : (
            <ul className="space-y-2.5">
              {comments.map((c) => <li key={c.id}><CommentRow comment={c} /></li>)}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-16 self-start space-y-3">
        <div className="card p-3.5 text-[12.5px] text-ink-body space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Posting standards</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Comments accept opinion + analysis.</li>
            <li>Rebuttals MUST cite a source URL.</li>
            <li>Context notes MUST cite a source URL.</li>
          </ul>
        </div>
        <div className="card p-3.5 text-[12px]">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Author</div>
          <Link href={`/profile/${claim.authorUsername}`} className="block text-link hover:underline mt-1">@{claim.authorUsername}</Link>
        </div>
      </aside>
    </div>
  );
}

// ─── Comment composer ─────────────────────────────────────────────────────

function CommentComposer({
  claimId, authorUsername, authorDisplayName, authorPhotoURL, onPosted,
}: {
  claimId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  onPosted: () => Promise<void> | void;
}) {
  const [type, setType] = useState<CommentType>("comment");
  const [body, setBody] = useState("");
  const [evInput, setEvInput] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addEv() {
    const u = evInput.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) { setError("Must be a real http(s) URL"); return; }
    if (evidence.length >= 5) { setError("Max 5 evidence URLs per comment."); return; }
    if (evidence.includes(u)) { setError("Already attached."); return; }
    setEvidence([...evidence, u]);
    setEvInput("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createComment(
        { claimId, body, type, evidenceUrls: evidence },
        { authorUsername, authorDisplayName, authorPhotoURL },
      );
      setBody("");
      setEvidence([]);
      await onPosted();
    } catch (e) {
      if (e instanceof ClientError) setError(e.message);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const requiresEvidence = type === "rebuttal" || type === "context";

  return (
    <form onSubmit={submit} className="card p-3 space-y-2">
      <div className="flex items-center gap-2 text-[12px]">
        <div className="text-ink-muted">Type:</div>
        {(["comment", "rebuttal", "context"] as CommentType[]).map((t) => (
          <button
            key={t} type="button" onClick={() => setType(t)}
            className={`px-2 py-0.5 rounded text-[11.5px] ${type === t ? "bg-brand-soft text-brand font-medium" : "text-ink-body hover:bg-section"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        rows={3} required minLength={MIN_COMMENT_LENGTH} maxLength={MAX_COMMENT_LENGTH}
        value={body} onChange={(e) => setBody(e.target.value)}
        placeholder={
          type === "rebuttal" ? "Counter-argument — what's wrong, and what evidence shows it?" :
          type === "context"  ? "What context is missing or being misframed?" :
                                 "Add a comment, analysis, or follow-up question."
        }
        className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
      />
      <div className={`space-y-1 ${requiresEvidence ? "" : "opacity-90"}`}>
        <div className="text-[11px] text-ink-muted">{requiresEvidence ? "Source URLs (required)" : "Source URLs (optional)"}</div>
        <div className="flex gap-1.5">
          <input
            type="url" value={evInput} onChange={(e) => setEvInput(e.target.value)}
            placeholder="https://example.com/source"
            className="flex-1 px-2 py-1.5 border border-line rounded text-[12.5px]"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEv(); } }}
          />
          <button type="button" onClick={addEv} className="text-[12px] bg-section hover:bg-line-soft px-2 py-1.5 rounded border border-line">Add</button>
        </div>
        {evidence.length > 0 && (
          <ul className="space-y-1">
            {evidence.map((u) => (
              <li key={u} className="flex items-center gap-2 text-[12px]">
                <span className="truncate flex-1 font-mono text-[11px]">{u}</span>
                <button type="button" onClick={() => setEvidence(evidence.filter((x) => x !== u))} className="text-ink-dim hover:text-verdict-red">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <div className="text-[12px] text-verdict-red">{error}</div>}
      <div className="flex items-center justify-end">
        <button type="submit" disabled={busy} className="text-[13px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded disabled:opacity-50">
          {busy ? "Posting…" : `Post ${type}`}
        </button>
      </div>
    </form>
  );
}

// ─── Comment row ─────────────────────────────────────────────────────────

function CommentRow({ comment: c }: { comment: CommentDoc }) {
  const typeMeta: Record<CommentType, { label: string; cls: string; accent: string }> = {
    comment:  { label: "Comment",  cls: "bg-section text-ink-body",                accent: "" },
    rebuttal: { label: "Rebuttal", cls: "bg-verdict-redSoft text-verdict-red",     accent: "border-l-4 border-verdict-red/60" },
    context:  { label: "Context",  cls: "bg-verdict-amberSoft text-verdict-amber", accent: "border-l-4 border-verdict-amber/60" },
  };
  const t = typeMeta[c.type];
  return (
    <article className={`card p-3 ${t.accent}`}>
      <header className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Avatar name={c.authorDisplayName} src={c.authorPhotoURL} size={22} />
        <Link href={`/profile/${c.authorUsername}`} className="text-ink-body hover:underline font-medium">{c.authorDisplayName}</Link>
        <span className="text-ink-dim">· {c.createdAt.slice(0, 10)}</span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[11px] ${t.cls}`}>{t.label}</span>
      </header>
      <p className="text-[13.5px] text-ink-body whitespace-pre-line leading-relaxed mt-1.5">{c.body}</p>
      {c.evidenceUrls.length > 0 && (
        <ul className="space-y-0.5 mt-1.5">
          {c.evidenceUrls.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="text-link hover:underline text-[12px] break-all">{u}</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ─── Report button ──────────────────────────────────────────────────────

function ReportButton({ claimId }: { claimId: string }) {
  const { status } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (status !== "signed-in") { router.push(`/login?next=/community/${claimId}`); return; }
    setBusy(true); setError(null);
    try {
      await createReport({ targetType: "claim", targetId: claimId, reason, details });
      setDone(true);
      setTimeout(() => setOpen(false), 1500);
    } catch (e) {
      if (e instanceof ClientError) setError(e.message);
      else setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="text-[12px] text-ink-muted hover:text-verdict-red px-2 py-1">⚐ Report</button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 card p-3 z-30 space-y-1.5 text-[13px]">
          {done ? (
            <div className="text-verdict-green text-[12.5px]">Report submitted. Thank you.</div>
          ) : (
            <>
              <div className="text-[11px] text-ink-muted uppercase tracking-wide">Report this claim</div>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-2 py-1 border border-line rounded text-[12.5px]">
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="fabricated-evidence">Fabricated evidence</option>
                <option value="broken-link">Broken or wrong link</option>
                <option value="paywall-bypass-attempt">Paywall bypass attempt</option>
                <option value="off-topic">Off-topic</option>
                <option value="other">Other</option>
              </select>
              <textarea
                rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder="What's wrong? (min 10 chars)"
                className="w-full px-2 py-1 border border-line rounded text-[12.5px] resize-vertical"
              />
              {error && <div className="text-[12px] text-verdict-red">{error}</div>}
              <button onClick={submit} disabled={busy} className="w-full text-[12px] bg-brand hover:bg-brand-hover text-white px-2 py-1 rounded disabled:opacity-50">
                {busy ? "Submitting…" : "Submit report"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonThread() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="card p-4 space-y-2">
        <div className="h-4 w-32 bg-section rounded animate-pulse" />
        <div className="h-7 w-3/4 bg-section rounded animate-pulse" />
        <div className="h-3 w-full bg-section rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-section rounded animate-pulse" />
      </div>
    </div>
  );
}
