"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FollowStore } from "@/lib/proofmedia/store";
import type { TopicFollow } from "@/lib/proofmedia/types";
import UserMenu from "./UserMenu";

const SUGGESTED_TAGS = [
  "politics", "health", "science", "ai", "climate", "law", "elections",
  "media-bias", "research", "data", "longform", "primary-sources",
];

export default function CommunitySidebar() {
  const [follows, setFollows] = useState<TopicFollow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setFollows(FollowStore.list()); setMounted(true); }, []);

  function toggle(tag: string) {
    if (FollowStore.has(tag)) FollowStore.remove(tag); else FollowStore.add(tag);
    setFollows(FollowStore.list());
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-16 self-start">
      <UserMenu />

      <div className="card p-3.5 space-y-2">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Topics</div>
        {mounted && follows.length > 0 && (
          <div className="space-y-1">
            <div className="text-[12px] text-ink-body">Followed</div>
            <div className="flex flex-wrap gap-1">
              {follows.map((f) => (
                <button
                  key={f.tag}
                  type="button"
                  onClick={() => toggle(f.tag)}
                  className="text-[11px] px-1.5 py-0.5 rounded border border-brand bg-brand-soft text-brand"
                  title="Click to unfollow"
                >
                  ✓ #{f.tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="text-[12px] text-ink-body pt-1">Suggestions</div>
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_TAGS.filter((t) => !FollowStore.has(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className="text-[11px] px-1.5 py-0.5 rounded border border-line text-ink-muted hover:bg-section hover:text-ink"
            >
              + #{t}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-ink-dim border-t border-line-soft pt-2">
          Following a topic is local-only — it filters your feed but is not shared.
        </div>
      </div>

      <div className="card p-3.5 space-y-1.5 text-[12px] text-ink-body">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">About this feed</div>
        <p className="leading-relaxed">
          ProofMedia is the evidence-first social layer of Proofbase. Every post
          must attach sources. Every rebuttal must cite. Context notes require evidence.
        </p>
        <div className="flex flex-col gap-1 pt-1 border-t border-line-soft">
          <Link href="/how-it-works" className="text-link hover:underline">How it works</Link>
          <Link href="/limitations"   className="text-link hover:underline">Limitations</Link>
          <Link href="/data-sources"  className="text-link hover:underline">Data sources</Link>
        </div>
      </div>
    </aside>
  );
}
