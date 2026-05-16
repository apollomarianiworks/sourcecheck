"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-hook";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { readFeed, type ClaimDoc } from "@/lib/community/firestore";
import { ALLOWED_CATEGORIES, type ClaimCategoryId } from "@/lib/community/validation";
import { evidenceNeedsForClaim, FEED_LANES, rankClaimsForLane } from "@/lib/proofmedia/engagement";
import type { EvidenceNeedKind, FeedLaneId } from "@/lib/proofmedia/types";
import Avatar from "@/components/proofmedia/Avatar";
import NotificationBell from "@/components/proofmedia/NotificationBell";
import ProgressPanel from "@/components/proofmedia/ProgressPanel";
import ShareActions from "@/components/proofmedia/ShareActions";
import SocialActionBar from "@/components/proofmedia/SocialActionBar";
import StarterPromptList from "@/components/proofmedia/StarterPromptList";
import TodayPanel from "@/components/proofmedia/TodayPanel";
import TopicOnboarding from "@/components/proofmedia/TopicOnboarding";
import ClaimComposer from "./composer";

const CATEGORY_LABEL: Record<ClaimCategoryId, string> = {
  "politics-news":    "Politics",
  "health-medical":   "Health",
  "science-research": "Science",
  "legal-court":      "Legal",
  "finance-business": "Finance",
  "technology":       "Tech",
  "celebrity-viral":  "Viral",
  "general":          "General",
};

type Sort = "newest" | "top" | "active";

export default function CommunityFeed() {
  const { status, profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClaimDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ClaimCategoryId | "all">("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [lane, setLane] = useState<FeedLaneId>("for-you");
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    readFeed({
      category: category === "all" ? null : category,
      sort,
      pageSize: 30,
    }).then((page) => {
      setItems(page.items);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
  }, [configured, category, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const laneItems = rankClaimsForLane(items, lane);
    if (!q) return laneItems;
    return laneItems.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.body.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, lane, query]);

  function handlePostClick() {
    if (status === "signed-in") setShowComposer((v) => !v);
    else router.push("/login?next=/community");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-8">
      <div className="space-y-4 min-w-0">
        {/* Header */}
        <header className="space-y-2">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">ProofMedia</div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-[26px] font-bold text-ink leading-tight">Community feed</h1>
            <button
              type="button"
              onClick={handlePostClick}
              className="bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
            >
              {status === "signed-in" ? (showComposer ? "Close composer" : "+ New claim") : "Sign in to post"}
            </button>
          </div>
          <p className="text-[13px] text-ink-muted max-w-2xl">
            Evidence-first claims. Every post must cite sources. Rebuttals and context notes require evidence too.
          </p>
        </header>

        <TopicOnboarding />

        {/* Composer */}
        {showComposer && status === "signed-in" && profile && (
          <ClaimComposer
            authorUsername={profile.username}
            authorDisplayName={profile.displayName}
            authorPhotoURL={profile.photoURL}
            onCreated={(id) => router.push(`/community/${id}`)}
            onCancel={() => setShowComposer(false)}
          />
        )}

        {/* Filters */}
        <div className="card p-2 space-y-2">
          <div className="flex flex-wrap gap-1 border-b border-line-soft pb-2">
            {FEED_LANES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLane(l.id)}
                className={`text-[11.5px] px-2 py-1 rounded transition-colors ${lane === l.id ? "bg-ink text-white" : "text-ink-body hover:bg-section"}`}
                title={l.description}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <FilterPill active={category === "all"} onClick={() => setCategory("all")}>All</FilterPill>
            {ALLOWED_CATEGORIES.map((c) => (
              <FilterPill key={c} active={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, body, tags…"
              className="flex-1 px-2 py-1 border border-line rounded text-[13px]"
            />
            <div className="flex gap-1">
              {(["newest", "top", "active"] as Sort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`text-[11.5px] px-2 py-1 rounded border ${sort === s ? "border-brand text-brand bg-brand-soft" : "border-line text-ink-muted hover:bg-section"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        {!configured ? (
          <NotConfigured lane={lane} />
        ) : loading ? (
          <FeedSkeleton />
        ) : error ? (
          <div className="card p-4 text-[13px] text-verdict-red">Feed failed: {error}</div>
        ) : filtered.length === 0 ? (
          <EmptyFeed status={status} onPost={handlePostClick} lane={lane} />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((c) => <li key={c.id}><FeedRow claim={c} /></li>)}
          </ul>
        )}
      </div>

      <CommunityRightRail />
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11.5px] px-2 py-1 rounded transition-colors ${active ? "bg-brand-soft text-brand font-medium" : "text-ink-body hover:bg-section"}`}
    >
      {children}
    </button>
  );
}

function FeedRow({ claim: c }: { claim: ClaimDoc }) {
  const ev = c.evidenceCount;
  const cc = c.commentCount;
  const verdict = c.sourceMeshSummary?.verdict;
  const needs = evidenceNeedsForClaim(c);
  return (
    <article className="card p-3.5 hover:border-ink-deep transition-colors">
      <div className="flex items-center gap-2 text-[11.5px] text-ink-muted mb-1.5">
        <Avatar name={c.authorDisplayName} src={c.authorPhotoURL} size={20} />
        <Link href={`/profile/${c.authorUsername}`} className="hover:underline text-ink-body">{c.authorDisplayName}</Link>
        <span className="text-ink-dim">· @{c.authorUsername}</span>
        <span className="text-ink-dim">· {c.createdAt.slice(0, 10)}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded bg-section text-ink-body">{CATEGORY_LABEL[c.category]}</span>
      </div>
      <Link href={`/community/${c.id}`} className="block text-[16px] font-bold text-ink hover:underline leading-snug">
        {c.title}
      </Link>
      {c.body && <p className="text-[13px] text-ink-body leading-relaxed mt-1 line-clamp-2">{c.body}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
        {verdict && <VerdictPill verdict={verdict} />}
        {needs.slice(0, 2).map((need) => <EvidenceNeedPill key={need} need={need} />)}
        {c.tags.slice(0, 4).map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded bg-section text-ink-body">#{t}</span>
        ))}
        <ShareActions targetId={c.id} title={c.title} url={`/community/${c.id}`} evidenceCount={ev} />
        <span className="text-ink-dim ml-auto">{ev} evidence · {cc} comments · score {c.score}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-line-soft">
        <SocialActionBar targetId={c.id} />
      </div>
    </article>
  );
}

function EvidenceNeedPill({ need }: { need: EvidenceNeedKind }) {
  const labels: Record<EvidenceNeedKind, string> = {
    "needs-source": "Needs source",
    "needs-primary-source": "Needs primary source",
    "needs-opposing-evidence": "Needs opposing evidence",
    "needs-timeline-context": "Needs timeline context",
    "needs-expert-source": "Needs expert source",
    "needs-legal-clarification": "Needs legal/source clarity",
  };
  return <span className="px-1.5 py-0.5 rounded bg-verdict-amberSoft text-verdict-amber font-medium">{labels[need]}</span>;
}

function VerdictPill({ verdict }: { verdict: NonNullable<ClaimDoc["sourceMeshSummary"]>["verdict"] }) {
  const map: Record<typeof verdict, { label: string; cls: string }> = {
    "supports":      { label: "SourceMesh: Supported",  cls: "bg-verdict-greenSoft text-verdict-green" },
    "disputes":      { label: "SourceMesh: Disputed",   cls: "bg-verdict-redSoft text-verdict-red" },
    "mixed":         { label: "SourceMesh: Mixed",      cls: "bg-verdict-amberSoft text-verdict-amber" },
    "related-only":  { label: "SourceMesh: Unverified", cls: "bg-section text-ink-muted" },
    "none":          { label: "SourceMesh: No evidence",cls: "bg-section text-ink-muted" },
  };
  const m = map[verdict];
  return <span className={`px-1.5 py-0.5 rounded font-medium ${m.cls}`}>{m.label}</span>;
}

function FeedSkeleton() {
  return (
    <ul className="space-y-2.5" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="card p-3.5 space-y-2">
          <div className="h-3 w-32 bg-section rounded animate-pulse" />
          <div className="h-5 w-3/4 bg-section rounded animate-pulse" />
          <div className="h-3 w-full bg-section rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-section rounded animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function EmptyFeed({ status, onPost, lane }: { status: string; onPost: () => void; lane: FeedLaneId }) {
  return (
    <div className="space-y-3">
      <div className="card p-8 text-center space-y-3">
      <h2 className="text-[18px] font-bold text-ink">No real claims in this lane yet</h2>
      <p className="text-[13px] text-ink-muted max-w-prose mx-auto">
        Proofbase will not invent posts, fake trending questions, or fake engagement. Start a sourced claim or use a starter prompt below.
      </p>
      <button
        type="button" onClick={onPost}
        className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded text-[13px] font-medium"
      >
        {status === "signed-in" ? "Start your first claim" : "Sign in to post"}
      </button>
      </div>
      <StarterPromptList lane={lane} />
    </div>
  );
}

function NotConfigured({ lane }: { lane: FeedLaneId }) {
  return (
    <div className="space-y-3">
    <div className="card p-6 space-y-2">
      <h2 className="text-[16px] font-bold text-ink">Community is offline</h2>
      <p className="text-[13px] text-ink-muted">Firebase isn&apos;t configured in this environment. Set the <code>NEXT_PUBLIC_FIREBASE_*</code> env vars to enable signup, posting, and the real feed.</p>
      <p className="text-[13px] text-ink-muted">
        The fact-checking tools (<Link className="text-link hover:underline" href="/">home</Link>, <Link className="text-link hover:underline" href="/compare">compare</Link>, <Link className="text-link hover:underline" href="/explorer">explorer</Link>) work without Firebase — only the social layer needs it.
      </p>
    </div>
    <StarterPromptList lane={lane} />
    </div>
  );
}

function CommunityRightRail() {
  return (
    <aside className="space-y-3 lg:sticky lg:top-16 self-start">
      <TodayPanel />
      <ProgressPanel />
      <NotificationBell />
      <div className="card p-3.5 space-y-2 text-[12.5px] text-ink-body">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">House rules</div>
        <ul className="list-disc pl-4 space-y-1">
          <li>Every claim must cite at least one real source.</li>
          <li>Rebuttals and context notes require evidence.</li>
          <li>Spam, fabricated sources, or paywall-bypassing posts will be removed.</li>
          <li>Be specific. Vague claims get flagged as low-quality.</li>
        </ul>
      </div>
      <div className="card p-3.5 space-y-1 text-[12.5px]">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Documentation</div>
        <Link href="/how-it-works" className="block text-link hover:underline">How Proofbase works</Link>
        <Link href="/limitations"  className="block text-link hover:underline">What this tool cannot do</Link>
        <Link href="/data-sources" className="block text-link hover:underline">Where data comes from</Link>
      </div>
    </aside>
  );
}
