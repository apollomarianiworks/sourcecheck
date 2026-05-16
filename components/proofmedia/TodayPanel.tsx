"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FollowStore, localCounts } from "@/lib/proofmedia/store";
import { STARTER_PROMPTS } from "@/lib/proofmedia/engagement";

export default function TodayPanel() {
  const [counts, setCounts] = useState<ReturnType<typeof localCounts> | null>(null);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    setCounts(localCounts());
    setTopics(FollowStore.list().map((f) => f.tag));
  }, []);

  if (!counts) return null;
  const prompt = STARTER_PROMPTS.find((p) => topics.includes(p.topic)) ?? STARTER_PROMPTS[0];

  return (
    <section className="card p-3.5 space-y-2.5">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Today in Proofbase</div>
        <h2 className="text-[15px] font-bold text-ink">Continue useful research</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <MiniStat label="Saved collections" value={counts.collections} />
        <MiniStat label="Topics followed" value={counts.follows} />
      </div>
      {counts.claims > 0 || counts.collections > 0 || counts.debates > 0 ? (
        <div className="rounded border border-line-soft bg-section p-2 text-[12px] text-ink-body">
          Continue where you left off: {counts.claims} local claims, {counts.collections} collections, {counts.debates} debate rooms.
        </div>
      ) : (
        <div className="rounded border border-line-soft bg-section p-2 text-[12px] text-ink-body">
          Suggested starter prompt, not live activity: {prompt.title.replace("Starter prompt: ", "")}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Link href="/routines" className="text-[12px] px-2 py-1 rounded border border-line hover:bg-section no-underline text-ink-body">
          Suggest routine
        </Link>
        <Link href="/collections" className="text-[12px] px-2 py-1 rounded border border-line hover:bg-section no-underline text-ink-body">
          Open collections
        </Link>
        <Link href={prompt.href} className="text-[12px] px-2 py-1 rounded bg-brand text-white no-underline">
          Start research
        </Link>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line-soft px-2 py-1">
      <div className="font-bold text-ink">{value}</div>
      <div className="text-ink-muted">{label}</div>
    </div>
  );
}
