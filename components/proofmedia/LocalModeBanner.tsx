"use client";

import Link from "next/link";

/**
 * Honest banner displayed on every social/community page making clear that
 * data lives in this browser only — nothing is published, nothing is shared,
 * no other users exist. This is "the social layer of a research platform
 * before the social layer is online."
 */
export default function LocalModeBanner() {
  return (
    <div className="card p-3 bg-section/60 text-[12px] text-ink-body space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="inline-block px-1.5 py-0.5 rounded bg-verdict-amberSoft text-verdict-amber font-medium text-[11px]">
          Local mode
        </span>
        <span className="text-ink-body">
          Claims, collections, debates, and your profile are saved in this browser only.
        </span>
      </div>
      <div className="text-ink-muted text-[11.5px]">
        Nothing is published, shared with other users, or sent to a server.
        See <Link href="/how-it-works" className="text-link hover:underline">How it works</Link>{" "}
        and <Link href="/limitations" className="text-link hover:underline">Limitations</Link>.
      </div>
    </div>
  );
}
