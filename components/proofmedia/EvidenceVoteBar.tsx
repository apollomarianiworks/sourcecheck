"use client";

import { useState } from "react";

interface Props {
  initialUp?: number;
  initialDown?: number;
  /** When provided, called with the new net vote. Persistence is up to caller. */
  onChange?: (next: { up: number; down: number; net: number; myVote: -1 | 0 | 1 }) => void;
}

/**
 * Reddit-style up/down bar with strict UX:
 *  - votes are LOCAL-ONLY (no fan-out)
 *  - one vote per device per item
 *  - copy is "Useful evidence?" not "Like/dislike" — votes signal evidence
 *    quality, not popularity
 */
export default function EvidenceVoteBar({ initialUp = 0, initialDown = 0, onChange }: Props) {
  const [up, setUp]     = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [my, setMy]     = useState<-1 | 0 | 1>(0);

  function vote(v: -1 | 1) {
    let nextMy: -1 | 0 | 1 = my === v ? 0 : v;
    let dUp = 0, dDown = 0;
    if (my === 1)  dUp   -= 1;
    if (my === -1) dDown -= 1;
    if (nextMy === 1)  dUp   += 1;
    if (nextMy === -1) dDown += 1;
    const u = Math.max(0, up + dUp);
    const d = Math.max(0, down + dDown);
    setUp(u); setDown(d); setMy(nextMy);
    onChange?.({ up: u, down: d, net: u - d, myVote: nextMy });
  }

  return (
    <div className="inline-flex items-center gap-1 text-[12px]" aria-label="Vote evidence quality">
      <button
        type="button"
        onClick={() => vote(1)}
        aria-pressed={my === 1}
        className={`px-1.5 py-0.5 rounded border ${my === 1 ? "border-verdict-green bg-verdict-greenSoft text-verdict-green" : "border-line text-ink-muted hover:bg-section"}`}
        title="Mark as useful evidence"
      >
        ▲ {up}
      </button>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-pressed={my === -1}
        className={`px-1.5 py-0.5 rounded border ${my === -1 ? "border-verdict-red bg-verdict-redSoft text-verdict-red" : "border-line text-ink-muted hover:bg-section"}`}
        title="Mark as weak/irrelevant evidence"
      >
        ▼ {down}
      </button>
      <span className="text-ink-dim ml-1 text-[11px]">local vote</span>
    </div>
  );
}
