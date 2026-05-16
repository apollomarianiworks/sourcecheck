"use client";

import { useEffect, useState } from "react";
import { FollowStore } from "@/lib/proofmedia/store";
import { STARTER_TOPICS, hasSeenOnboarding, markOnboardingSeen } from "@/lib/proofmedia/engagement";
import { trackProofmediaEvent } from "@/lib/proofmedia/analytics";

export default function TopicOnboarding() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    setDismissed(hasSeenOnboarding() || FollowStore.list().length > 0);
    setFollowing(new Set(FollowStore.list().map((f) => f.tag.toLowerCase())));
  }, []);

  function toggle(topic: string) {
    const key = topic.toLowerCase();
    if (following.has(key)) FollowStore.remove(key);
    else {
      FollowStore.add(key);
      trackProofmediaEvent("topic_followed", { topic: key, source: "onboarding" });
    }
    setFollowing(new Set(FollowStore.list().map((f) => f.tag.toLowerCase())));
  }

  function finish() {
    markOnboardingSeen();
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  return (
    <section className="card p-4 space-y-3 border-brand/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Topic onboarding</div>
          <h2 className="text-[17px] font-bold text-ink">Choose topics for better evidence prompts</h2>
          <p className="text-[12.5px] text-ink-muted max-w-2xl">
            Topic follows are local in this environment. They shape your feed suggestions, routine ideas, debate prompts, and evidence-needed lanes.
          </p>
        </div>
        <button type="button" onClick={finish} className="text-[12px] text-ink-muted hover:text-ink">
          Done
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STARTER_TOPICS.map((topic) => {
          const active = following.has(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggle(topic)}
              className={`text-[12px] px-2.5 py-1 rounded border transition-colors ${
                active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-body hover:bg-section"
              }`}
              aria-pressed={active}
            >
              {active ? "Following " : "Follow "}{topic.replace(/-/g, " ")}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-ink-dim">
        No fake recommendations: when there is no real community activity, Proofbase shows starter prompts clearly labeled as prompts.
      </div>
    </section>
  );
}
