"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DebateStore } from "@/lib/proofmedia/store";
import type { DebateRoom } from "@/lib/proofmedia/types";
import { slugify, uniqueId } from "@/lib/proofmedia/slug";
import { getLocalAccount } from "@/lib/auth/local";
import DebateRoomCard from "@/components/proofmedia/DebateRoomCard";
import LocalModeBanner from "@/components/proofmedia/LocalModeBanner";
import EmptyState from "@/components/proofmedia/EmptyState";

export default function DebatesIndex() {
  const [rooms, setRooms] = useState<DebateRoom[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setRooms(DebateStore.list()); setMounted(true); }, []);

  function create(topic: string, prompt: string) {
    if (!topic.trim()) return;
    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    const id = `${slugify(topic, "debate")}-${uniqueId("d").slice(2, 8)}`;
    const room: DebateRoom = {
      id,
      topic: topic.trim(),
      prompt: prompt.trim() || `Debate the claim: ${topic.trim()}`,
      positions: [
        { id: "pro", label: "Pro", description: "Argues in favor",  ownerUsername: null },
        { id: "con", label: "Con", description: "Argues against",   ownerUsername: null },
      ],
      rounds: [],
      status: "draft",
      rules: [
        "Every argument must cite a real source URL.",
        "Quoting verbatim from a source requires the URL of the source.",
        "No personal attacks; criticise the argument, not the person.",
      ],
      audienceVotingEnabled: false,
      owner: {
        authorUsername: account?.username ?? "you",
        authorDisplayName: account?.displayName ?? "You",
        createdAt: stamp, updatedAt: stamp,
      },
    };
    DebateStore.upsert(room);
    setRooms(DebateStore.list());
  }

  return (
    <div className="space-y-5 max-w-result mx-auto">
      <header className="space-y-2">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">ProofMedia · Debates</div>
        <h1 className="text-[28px] md:text-[32px] font-bold text-ink leading-tight">Evidence-first debate rooms</h1>
        <p className="text-[14px] text-ink-body leading-relaxed">
          Structured debates with explicit Pro / Con positions, rounds, and source-attached arguments.
          Audience voting and live timing are intentionally disabled — debates here exist to surface evidence, not crown winners.
        </p>
      </header>

      <LocalModeBanner />

      <NewDebateForm onCreate={create} />

      <section className="space-y-2.5">
        <h2 className="text-[14px] font-bold text-ink">Your debate rooms ({mounted ? rooms.length : 0})</h2>
        {!mounted ? (
          <div className="text-ink-dim text-[13px]">Loading…</div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon="⚖"
            title="No debates yet"
            body="Create a debate room above. Each side must cite a real source for every argument. Rooms stay on your device until accounts ship."
          />
        ) : (
          <ul className="space-y-2.5">
            {rooms.map((r) => <li key={r.id}><DebateRoomCard room={r} /></li>)}
          </ul>
        )}
      </section>

      <div className="text-[12px] text-ink-dim border-t border-line-soft pt-3 leading-relaxed">
        Looking for the casual debate prompt tool? <Link href="/debate" className="text-link hover:underline">/debate</Link> ·
        Looking for a single claim thread? <Link href="/community" className="text-link hover:underline">/community</Link>
      </div>
    </div>
  );
}

function NewDebateForm({ onCreate }: { onCreate: (topic: string, prompt: string) => void }) {
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onCreate(topic, prompt); setTopic(""); setPrompt(""); }}
      className="card p-3.5 space-y-1.5"
    >
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Start a new debate</div>
      <input
        type="text" required value={topic} onChange={(e) => setTopic(e.target.value)}
        placeholder='Debate topic — e.g. "Should nuclear be classified as clean energy?"'
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      />
      <textarea
        rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional prompt or context — what specifically should each side address?"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink-dim">Pro and Con positions are created automatically. You can fill either side.</span>
        <button type="submit" className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded">
          Create debate
        </button>
      </div>
    </form>
  );
}
