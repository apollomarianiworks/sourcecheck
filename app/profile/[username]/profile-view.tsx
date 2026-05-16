"use client";

import { useEffect, useState } from "react";
import { getLocalAccount, subscribeLocalAccount, type LocalAccount } from "@/lib/auth/local";
import { ClaimStore, CollectionStore, DebateStore, ProfileStore } from "@/lib/proofmedia/store";
import type { ResearchProfile, ResearchBadge, ClaimThread, Collection, DebateRoom } from "@/lib/proofmedia/types";
import ClaimPostCard from "@/components/proofmedia/ClaimPostCard";
import CollectionPreviewCard from "@/components/proofmedia/CollectionPreviewCard";
import DebateRoomCard from "@/components/proofmedia/DebateRoomCard";
import ResearchProfileCard from "@/components/proofmedia/ResearchProfileCard";
import EmptyState from "@/components/proofmedia/EmptyState";
import LocalModeBanner from "@/components/proofmedia/LocalModeBanner";

interface Props { username: string; }

export default function ProfileView({ username }: Props) {
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAccount(getLocalAccount());
    setMounted(true);
    return subscribeLocalAccount(setAccount);
  }, []);

  if (!mounted) return <div className="text-ink-dim text-[13px]">Loading…</div>;

  const isLocalUser = account?.username === username;
  if (!isLocalUser) {
    return (
      <div className="space-y-4 max-w-result mx-auto">
        <LocalModeBanner />
        <EmptyState
          icon="@"
          title={`@${username} — profile not available`}
          body="ProofMedia is local-first in PASS 16. The only profile that exists on this device is yours. Other usernames cannot be looked up — there's no server yet."
          cta={account ? { href: `/profile/${account.username}`, label: "Go to your profile →" } : { href: "/community", label: "Back to community →" }}
        />
      </div>
    );
  }

  return <SelfProfile account={account} />;
}

function SelfProfile({ account }: { account: LocalAccount }) {
  const claims = ClaimStore.list().filter((c) => c.owner.authorUsername === account.username);
  const collections = CollectionStore.list().filter((c) => c.owner.authorUsername === account.username);
  const debates = DebateStore.list().filter((d) => d.owner.authorUsername === account.username);

  const profile = computeProfile(account, claims, collections, debates);
  // Persist computed profile so other surfaces can read it
  ProfileStore.set(profile);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 lg:gap-8">
      <div className="space-y-3 lg:sticky lg:top-16 self-start">
        <ResearchProfileCard profile={profile} />
      </div>

      <div className="space-y-5 min-w-0">
        <LocalModeBanner />

        <Section title={`Claims (${claims.length})`}>
          {claims.length === 0
            ? <p className="text-[13px] text-ink-muted">No claims posted yet.</p>
            : <ul className="space-y-2.5">{claims.map((c) => <li key={c.id}><ClaimPostCard claim={c} /></li>)}</ul>}
        </Section>

        <Section title={`Collections (${collections.length})`}>
          {collections.length === 0
            ? <p className="text-[13px] text-ink-muted">No collections yet.</p>
            : <ul className="space-y-2.5">{collections.map((c) => <li key={c.id}><CollectionPreviewCard collection={c} /></li>)}</ul>}
        </Section>

        <Section title={`Debates (${debates.length})`}>
          {debates.length === 0
            ? <p className="text-[13px] text-ink-muted">Not in any debate rooms yet.</p>
            : <ul className="space-y-2.5">{debates.map((d) => <li key={d.id}><DebateRoomCard room={d} /></li>)}</ul>}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function computeProfile(account: LocalAccount, claims: ClaimThread[], collections: Collection[], debates: DebateRoom[]): ResearchProfile {
  const evidenceAdded = claims.reduce((s, c) => s + c.evidence.length, 0);
  const rebuttalsPosted = claims.reduce((s, c) => s + c.rebuttals.filter((r) => r.owner.authorUsername === account.username).length, 0);
  const contextNotesPosted = claims.reduce((s, c) => s + c.contextNotes.filter((n) => n.owner.authorUsername === account.username).length, 0);
  const collectionsPublic = collections.filter((c) => c.isPublic).length;

  const claimsWithScore = claims.filter((c) => typeof c.sourceMeshSummary?.sourceQualityScore === "number");
  const avgScore = claimsWithScore.length === 0
    ? 0
    : claimsWithScore.reduce((s, c) => s + (c.sourceMeshSummary?.sourceQualityScore ?? 0), 0) / claimsWithScore.length;
  const avgEvidencePerClaim = claims.length === 0 ? 0 : evidenceAdded / claims.length;

  const badges: ResearchBadge[] = [];
  const now = new Date().toISOString();
  if (claims.length >= 1)        badges.push({ kind: "first-claim",          earnedAt: now, label: "First claim",          detail: "You've posted at least one claim." });
  if (collections.length >= 1)   badges.push({ kind: "first-collection",     earnedAt: now, label: "First collection",     detail: "You've created at least one collection." });
  if (claims.length >= 5 && evidenceAdded >= claims.length) badges.push({ kind: "evidence-contributor", earnedAt: now, label: "Evidence contributor", detail: "5+ claims with at least one source each." });
  if (contextNotesPosted >= 3)   badges.push({ kind: "context-noter",        earnedAt: now, label: "Context noter",        detail: "3+ context notes posted." });
  if (debates.length >= 1)       badges.push({ kind: "debater",              earnedAt: now, label: "Debater",              detail: "Joined or hosted at least one debate room." });
  if (collections.some((c) => c.items.length >= 5)) badges.push({ kind: "researcher", earnedAt: now, label: "Researcher", detail: "At least one collection with 5+ items." });
  if (claims.length >= 2 && claims.every((c) => c.evidence.length >= 2)) badges.push({ kind: "transparency", earnedAt: now, label: "Transparency", detail: "Every claim has ≥2 evidence items." });

  const tags = new Set<string>();
  for (const c of claims) for (const t of c.tags) tags.add(t);
  for (const c of collections) for (const t of c.tags) tags.add(t);

  return {
    username: account.username,
    displayName: account.displayName,
    bio: "Local research profile. Stats are computed from your saved claims, collections, and debates.",
    joinedAt: account.createdAt,
    topicInterests: Array.from(tags).slice(0, 12),
    badges,
    metrics: {
      claimsPosted: claims.length,
      evidenceAdded,
      rebuttalsPosted,
      contextNotesPosted,
      debatesEntered: debates.length,
      collectionsPublic,
      avgEvidencePerClaim,
      avgSourceQualityScore: avgScore,
    },
  };
}
