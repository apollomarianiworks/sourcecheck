"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DebateStore } from "@/lib/proofmedia/store";
import type { DebateRoom, DebateRound, DebateEvidence, DebatePositionId, EvidenceAttachment } from "@/lib/proofmedia/types";
import { uniqueId } from "@/lib/proofmedia/slug";
import { getLocalAccount } from "@/lib/auth/local";
import EvidenceAttachmentCard from "@/components/proofmedia/EvidenceAttachmentCard";
import EmptyState from "@/components/proofmedia/EmptyState";
import LocalModeBanner from "@/components/proofmedia/LocalModeBanner";

interface Props { debateId: string; }

export default function DebateView({ debateId }: Props) {
  const [room, setRoom] = useState<DebateRoom | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setRoom(DebateStore.get(debateId)); setMounted(true); }, [debateId]);

  function save(next: DebateRoom) { DebateStore.upsert(next); setRoom(next); }

  function setStatus(status: DebateRoom["status"]) {
    if (!room) return;
    save({ ...room, status, owner: { ...room.owner, updatedAt: new Date().toISOString() } });
  }

  function joinSide(positionId: DebatePositionId) {
    if (!room) return;
    const account = getLocalAccount();
    if (!account) { alert("Sign in (top right) before joining a side."); return; }
    const positions = room.positions.map((p) =>
      p.id === positionId ? { ...p, ownerUsername: account.username } : p
    );
    save({ ...room, positions, status: room.status === "draft" ? "open" : room.status, owner: { ...room.owner, updatedAt: new Date().toISOString() } });
  }

  function startRound(prompt: string) {
    if (!room) return;
    const stamp = new Date().toISOString();
    const round: DebateRound = {
      id: uniqueId("rnd"),
      index: room.rounds.length + 1,
      prompt: prompt.trim() || `Round ${room.rounds.length + 1}`,
      startedAt: stamp,
      endedAt: null,
      evidence: [],
      notes: "",
    };
    save({ ...room, rounds: [...room.rounds, round], status: "in-progress", owner: { ...room.owner, updatedAt: stamp } });
  }

  function addEvidenceToRound(roundId: string, positionId: DebatePositionId, url: string) {
    if (!room) return;
    if (!/^https?:\/\//.test(url.trim())) { alert("Debate evidence must be a real http(s) URL."); return; }
    const account = getLocalAccount();
    const stamp = new Date().toISOString();
    let host: string | null = null;
    try { host = new URL(url.trim()).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    const ev: EvidenceAttachment = {
      id: uniqueId("ev"), url: url.trim(), type: "article", title: url.trim(),
      publisher: host, publisherDomain: host, publishedAt: null,
      snippet: "", stance: "supports", whyItMatters: null,
      sourceCategory: null, sourceQualityScore: null,
      warningFlags: [], limitations: [], addedAt: stamp, addedBy: account?.username ?? "you",
    };
    const de: DebateEvidence = { id: uniqueId("de"), positionId, evidence: ev, addedAt: stamp };
    const rounds = room.rounds.map((r) => r.id === roundId ? { ...r, evidence: [...r.evidence, de] } : r);
    save({ ...room, rounds, owner: { ...room.owner, updatedAt: stamp } });
  }

  if (!mounted) return <div className="text-ink-dim text-[13px]">Loading…</div>;
  if (!room) {
    return (
      <EmptyState
        icon="⚖"
        title="Debate not found"
        body="This debate room isn't in your local browser storage."
        cta={{ href: "/debates", label: "Back to debates →" }}
      />
    );
  }

  const account = getLocalAccount();
  return (
    <div className="space-y-5 max-w-result mx-auto">
      <div className="flex items-center gap-2 text-[12px]">
        <Link href="/debates" className="text-link hover:underline">← All debates</Link>
      </div>

      <LocalModeBanner />

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <span className="px-1.5 py-0.5 rounded bg-section text-ink-body">Status: {room.status}</span>
          <span className="text-ink-dim">· started {room.owner.createdAt.slice(0, 10)}</span>
          <span className="ml-auto text-ink-dim">audience voting: off (by design)</span>
        </div>
        <h1 className="text-[26px] font-bold text-ink leading-tight">{room.topic}</h1>
        <p className="text-[14px] text-ink-body">{room.prompt}</p>
      </header>

      {/* Positions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {room.positions.filter((p) => p.id === "pro" || p.id === "con").map((p) => {
          const isMine = account && p.ownerUsername === account.username;
          return (
            <div key={p.id} className={`card p-3 space-y-1 ${p.id === "pro" ? "border-l-4 border-verdict-green/60" : "border-l-4 border-verdict-red/60"}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold text-ink">{p.label}</h3>
                {p.ownerUsername ? (
                  <span className="text-[11px] text-ink-muted">@{p.ownerUsername}</span>
                ) : (
                  <button
                    onClick={() => joinSide(p.id)}
                    className="text-[12px] bg-brand hover:bg-brand-hover text-white px-2 py-0.5 rounded"
                  >
                    Take {p.label}
                  </button>
                )}
              </div>
              <p className="text-[12px] text-ink-muted">{p.description}</p>
              {isMine && <span className="text-[11px] text-verdict-green">You're holding this side.</span>}
            </div>
          );
        })}
      </section>

      {/* Rules */}
      <section className="card p-3 space-y-1">
        <h3 className="text-[12px] uppercase tracking-wide text-ink-muted">Rules</h3>
        <ul className="text-[12.5px] text-ink-body space-y-0.5 list-disc pl-5">
          {room.rules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </section>

      {/* Controls */}
      <section className="card p-3 space-y-2">
        <h3 className="text-[12px] uppercase tracking-wide text-ink-muted">Moderation</h3>
        <div className="flex flex-wrap gap-1.5 text-[12px]">
          <button onClick={() => setStatus("draft")}       className="px-2 py-1 border border-line rounded hover:bg-section">Mark draft</button>
          <button onClick={() => setStatus("open")}        className="px-2 py-1 border border-line rounded hover:bg-section">Open</button>
          <button onClick={() => setStatus("in-progress")} className="px-2 py-1 border border-line rounded hover:bg-section">In progress</button>
          <button onClick={() => setStatus("closed")}      className="px-2 py-1 border border-line rounded hover:bg-section">Close</button>
        </div>
      </section>

      {/* Rounds */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-bold text-ink">Rounds ({room.rounds.length})</h2>
        {room.rounds.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No rounds yet. Start one below.</p>
        ) : (
          <ul className="space-y-3">
            {room.rounds.map((rnd) => (
              <RoundBlock key={rnd.id} round={rnd} onAddEvidence={addEvidenceToRound} />
            ))}
          </ul>
        )}

        <StartRoundForm onStart={startRound} />
      </section>

      <div className="text-[12px] text-ink-dim border-t border-line-soft pt-3 leading-relaxed">
        Debate rooms are local-only in PASS 16. Real-time turn-taking and audience voting are deliberately deferred —
        the architecture is ready (`DebateRoom`, `DebateRound`, `DebatePosition`) when a server backend lands.
      </div>
    </div>
  );
}

function RoundBlock({
  round,
  onAddEvidence,
}: {
  round: DebateRound;
  onAddEvidence: (roundId: string, side: DebatePositionId, url: string) => void;
}) {
  const pro = round.evidence.filter((e) => e.positionId === "pro");
  const con = round.evidence.filter((e) => e.positionId === "con");

  return (
    <li className="card p-3 space-y-2.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[14px] font-bold text-ink">Round {round.index}</span>
        <span className="text-[12px] text-ink-muted">· {round.prompt}</span>
        <span className="text-[11px] text-ink-dim ml-auto">started {round.startedAt.slice(0, 16).replace("T", " ")}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SideColumn side="pro" items={pro} round={round} onAdd={onAddEvidence} />
        <SideColumn side="con" items={con} round={round} onAdd={onAddEvidence} />
      </div>
    </li>
  );
}

function SideColumn({
  side, items, round, onAdd,
}: {
  side: DebatePositionId;
  items: DebateEvidence[];
  round: DebateRound;
  onAdd: (roundId: string, side: DebatePositionId, url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const label = side === "pro" ? "Pro" : side === "con" ? "Con" : side;
  const accent = side === "pro" ? "border-verdict-green/40" : "border-verdict-red/40";
  return (
    <div className={`border ${accent} rounded p-2.5 space-y-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-ink">{label}</span>
        <span className="text-[11px] text-ink-dim">{items.length} source{items.length === 1 ? "" : "s"}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-ink-muted italic">No evidence yet for this side this round.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((de) => <li key={de.id}><EvidenceAttachmentCard evidence={de.evidence} variant="inline" /></li>)}
        </ul>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(round.id, side, url); setUrl(""); }}
        className="flex items-center gap-1"
      >
        <input
          type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="Source URL"
          className="flex-1 px-2 py-1 border border-line rounded text-[12px]"
        />
        <button type="submit" className="text-[11px] bg-brand hover:bg-brand-hover text-white px-2 py-1 rounded">
          Cite
        </button>
      </form>
    </div>
  );
}

function StartRoundForm({ onStart }: { onStart: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onStart(prompt); setPrompt(""); }}
      className="card p-3 space-y-1.5"
    >
      <div className="text-[11px] text-ink-muted uppercase tracking-wide">Start a new round</div>
      <input
        type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="Round prompt — e.g. 'Best evidence for safety record over 2010-2020'"
        className="w-full px-2 py-1.5 border border-line rounded text-[13px]"
      />
      <div className="flex justify-end">
        <button type="submit" className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1 rounded">
          Start round
        </button>
      </div>
    </form>
  );
}
