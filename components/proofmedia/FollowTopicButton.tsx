"use client";

import { useEffect, useState } from "react";
import { FollowStore } from "@/lib/proofmedia/store";

interface Props { tag: string; }

export default function FollowTopicButton({ tag }: Props) {
  const [following, setFollowing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFollowing(FollowStore.has(tag));
    setMounted(true);
  }, [tag]);

  function toggle() {
    if (following) { FollowStore.remove(tag); setFollowing(false); }
    else           { FollowStore.add(tag);    setFollowing(true); }
  }

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`text-[12px] px-2 py-0.5 rounded border transition-colors ${
        following
          ? "border-brand bg-brand-soft text-brand"
          : "border-line text-ink-muted hover:bg-section hover:text-ink"
      }`}
      aria-pressed={following}
    >
      {following ? "✓ Following" : "+ Follow topic"}
    </button>
  );
}
