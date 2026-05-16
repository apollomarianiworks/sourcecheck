"use client";

import Link from "next/link";
import type { FeedLaneId } from "@/lib/proofmedia/types";
import { getStarterPromptsForLane } from "@/lib/proofmedia/engagement";

export default function StarterPromptList({ lane }: { lane: FeedLaneId }) {
  const prompts = getStarterPromptsForLane(lane);
  return (
    <section className="card p-4 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Starter prompts</div>
        <h2 className="text-[16px] font-bold text-ink">No real posts in this lane yet</h2>
        <p className="text-[12.5px] text-ink-muted">
          These are suggestions for research actions, not fake community posts or fake trending activity.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {prompts.map((prompt) => (
          <article key={prompt.id} className="rounded border border-line-soft bg-section p-3 space-y-2">
            <div className="text-[11px] text-ink-muted">Topic: {prompt.topic.replace(/-/g, " ")}</div>
            <h3 className="text-[14px] font-bold text-ink leading-snug">{prompt.title}</h3>
            <p className="text-[12px] text-ink-body leading-relaxed">{prompt.body}</p>
            <Link href={prompt.href} className="inline-block text-[12px] text-link hover:underline">
              {prompt.actionLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
