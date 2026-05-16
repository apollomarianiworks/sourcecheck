"use client";

import { useEffect, useState } from "react";
import type { ClaimPost } from "@/lib/community/types";

const KEY = "proofbase.community.claimDrafts.v1";

export default function CommunityTool() {
  const [claim, setClaim] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [posts, setPosts] = useState<ClaimPost[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
      setPosts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPosts([]);
    }
  }, []);

  function saveDraft() {
    if (!claim.trim()) return;
    const now = new Date().toISOString();
    const post: ClaimPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      claimText: claim.trim(),
      createdAt: now,
      visibility: "local-draft",
      evidence: sourceUrl.trim()
        ? [{ id: `${Date.now()}-e`, url: sourceUrl.trim(), label: "attached source", stance: "context", addedAt: now }]
        : [],
      rebuttals: [],
      contextNotes: [],
      votes: [],
    };
    const next = [post, ...posts].slice(0, 50);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setPosts(next);
    setClaim("");
    setSourceUrl("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
      <section className="card p-4 space-y-3">
        <h2 className="text-[18px] font-bold text-ink">Draft a public claim thread</h2>
        <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={5} className="w-full border border-line rounded px-3 py-2 text-[13px]" placeholder="Claim or debate prompt" />
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-[13px]" placeholder="Optional source URL" />
        <button type="button" onClick={saveDraft} className="bg-brand text-white rounded px-3 py-2 text-[13px]">Save local draft</button>
        <p className="text-[12px] text-ink-muted">No fake public feed: drafts stay in this browser until accounts and backend moderation exist.</p>
      </section>

      <section className="space-y-3">
        {posts.length > 0 ? posts.map((post) => (
          <article key={post.id} className="card p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">{post.visibility}</div>
            <h3 className="text-[16px] font-bold text-ink">{post.claimText}</h3>
            {post.evidence.length > 0 && (
              <ul className="text-[12px] space-y-1">
                {post.evidence.map((item) => <li key={item.id}><a className="text-link hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.url}</a></li>)}
              </ul>
            )}
          </article>
        )) : (
          <div className="card p-5 text-[13px] text-ink-muted">No local claim drafts yet.</div>
        )}
      </section>
    </div>
  );
}
