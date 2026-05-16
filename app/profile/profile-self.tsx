"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-hook";
import { updateProfile } from "@/lib/firebase/user-profile";
import { readClaimsByAuthor, readUserSaves, readClaim, type ClaimDoc, type SaveDoc } from "@/lib/community/firestore";
import { safeErrorMessage } from "@/lib/security/guard";
import { buildReputationSnapshot } from "@/lib/proofmedia/reputation";
import { CollectionStore } from "@/lib/proofmedia/store";
import Avatar from "@/components/proofmedia/Avatar";
import ProgressPanel from "@/components/proofmedia/ProgressPanel";
import ReputationPanel from "@/components/proofmedia/ReputationPanel";
import CreatorShowcase from "@/components/proofmedia/CreatorShowcase";

type Tab = "overview" | "claims" | "saved" | "settings";

export default function ProfileSelfRoute() {
  const { status, user, profile, reload } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = (params?.get("tab") as Tab) || "overview";

  useEffect(() => {
    if (status === "signed-out") router.replace("/login?next=/profile");
  }, [status, router]);

  if (status === "loading" || status === "not-configured") {
    return (
      <div className="card p-6 text-[13px] text-ink-muted">
        {status === "not-configured"
          ? "Firebase isn't configured. Sign-in is unavailable."
          : "Loading…"}
      </div>
    );
  }
  if (!user || !profile) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8">
      <aside className="space-y-3 lg:sticky lg:top-16 self-start">
        <div className="card p-4 space-y-2">
          <div className="h-20 rounded bg-[linear-gradient(135deg,#f7f7f7,#fdecec)] border border-line-soft" aria-hidden="true" />
          <Avatar name={profile.displayName} src={profile.photoURL} size={56} />
          <div>
            <div className="text-[16px] font-bold text-ink">{profile.displayName}</div>
            <div className="text-[12px] text-ink-muted">@{profile.username}</div>
          </div>
          {profile.bio && <p className="text-[13px] text-ink-body leading-relaxed">{profile.bio}</p>}
          <div className="flex flex-wrap gap-1.5">
            {["source quality", "context", "debate prep"].map((tag) => (
              <span key={tag} className="rounded-full border border-line bg-soft px-2 py-1 text-[11px] text-ink-muted">{tag}</span>
            ))}
          </div>
          <div className="rounded border border-line-soft bg-soft px-2 py-1.5 text-[11px] text-ink-muted">
            Verification placeholder: identity and expertise checks are planned, not simulated.
          </div>
          <Link
            href={`/profile/${profile.username}`}
            className="block text-[12px] text-link hover:underline"
          >
            View public profile →
          </Link>
        </div>
        <nav className="card p-2 text-[13px]">
          <TabLink to="overview" active={tab}>Overview</TabLink>
          <TabLink to="claims"   active={tab}>My claims</TabLink>
          <TabLink to="saved"    active={tab}>Saved</TabLink>
          <TabLink to="settings" active={tab}>Settings</TabLink>
        </nav>
      </aside>

      <div className="space-y-4 min-w-0">
        {tab === "overview" && <ProgressPanel />}
        {tab === "overview" && <CreatorShowcase />}
        {tab === "overview" && <OverviewPanel uid={user.uid} />}
        {tab === "claims"   && <MyClaimsPanel uid={user.uid} />}
        {tab === "saved"    && <SavedPanel uid={user.uid} />}
        {tab === "settings" && <SettingsPanel uid={user.uid} displayName={profile.displayName} bio={profile.bio} onSaved={reload} />}
      </div>
    </div>
  );
}

function TabLink({ to, active, children }: { to: Tab; active: Tab; children: React.ReactNode }) {
  const isActive = to === active;
  return (
    <Link
      href={`/profile?tab=${to}`}
      className={`block px-2 py-1.5 rounded transition-colors ${isActive ? "bg-brand-soft text-brand font-medium" : "text-ink-body hover:bg-section"}`}
    >
      {children}
    </Link>
  );
}

function OverviewPanel({ uid }: { uid: string }) {
  const [claims, setClaims] = useState<ClaimDoc[]>([]);
  const [saves, setSaves]   = useState<SaveDoc[]>([]);
  useEffect(() => {
    Promise.all([readClaimsByAuthor(uid).catch(() => []), readUserSaves(uid).catch(() => [])])
      .then(([c, s]) => { setClaims(c); setSaves(s); });
  }, [uid]);
  const reputation = buildReputationSnapshot({ claims, saves, collectionsCreated: CollectionStore.list().length });
  return (
    <div className="space-y-4">
      <ReputationPanel snapshot={reputation} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Claims posted" value={claims.length} />
        <Stat label="Saved items"   value={saves.length} />
        <Stat label="Evidence shared" value={claims.reduce((s, c) => s + c.evidenceCount, 0)} />
        <Stat label="Sources cited" value={reputation.metrics.sourcesCited} />
        <Stat label="Helpful rating" value={reputation.helpfulRating} />
        <Stat label="Profile views" value={reputation.metrics.profileViewsPlaceholder} />
      </div>
      <div className="card p-3.5 space-y-2">
        <h3 className="text-[14px] font-bold text-ink">Contribution timeline</h3>
        {claims.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Your evidence timeline appears after real posts, saves, context notes, or rebuttals.</p>
        ) : (
          <ul className="space-y-1.5 text-[12.5px]">
            {claims.slice(0, 5).map((claim) => (
              <li key={claim.id} className="rounded border border-line-soft bg-soft px-2 py-1">
                {claim.createdAt.slice(0, 10)}: posted {claim.evidenceCount} evidence link{claim.evidenceCount === 1 ? "" : "s"} on <Link href={`/community/${claim.id}`} className="text-link hover:underline">{claim.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card p-3.5 space-y-2">
        <h3 className="text-[14px] font-bold text-ink">Recent claims</h3>
        {claims.length === 0
          ? <p className="text-[13px] text-ink-muted">You haven&apos;t posted anything yet. <Link href="/community" className="text-link hover:underline">Start a claim →</Link></p>
          : <ul className="space-y-1.5">{claims.slice(0, 6).map((c) => <ClaimRow key={c.id} claim={c} />)}</ul>}
      </div>
    </div>
  );
}

function MyClaimsPanel({ uid }: { uid: string }) {
  const [claims, setClaims] = useState<ClaimDoc[] | null>(null);
  useEffect(() => { readClaimsByAuthor(uid).then(setClaims).catch(() => setClaims([])); }, [uid]);
  if (claims === null) return <div className="text-ink-muted text-[13px]">Loading…</div>;
  if (claims.length === 0)
    return <p className="text-[13px] text-ink-muted">No claims yet. <Link href="/community" className="text-link hover:underline">Post one →</Link></p>;
  return (
    <ul className="space-y-2">
      {claims.map((c) => <li key={c.id}><ClaimRow claim={c} /></li>)}
    </ul>
  );
}

function SavedPanel({ uid }: { uid: string }) {
  const [saves, setSaves] = useState<SaveDoc[] | null>(null);
  const [savedClaims, setSavedClaims] = useState<ClaimDoc[]>([]);
  useEffect(() => {
    readUserSaves(uid).then(async (s) => {
      setSaves(s);
      const claimIds = s.filter((x) => x.targetType === "claim").map((x) => x.targetId);
      const claims = await Promise.all(claimIds.map((id) => readClaim(id).catch(() => null)));
      setSavedClaims(claims.filter((c): c is ClaimDoc => c !== null));
    }).catch(() => setSaves([]));
  }, [uid]);

  if (saves === null) return <div className="text-ink-muted text-[13px]">Loading…</div>;
  if (saves.length === 0)
    return <p className="text-[13px] text-ink-muted">You haven&apos;t saved anything yet.</p>;
  return (
    <div className="space-y-3">
      <h3 className="text-[14px] font-bold text-ink">Saved claims ({savedClaims.length})</h3>
      {savedClaims.length === 0
        ? <p className="text-[12px] text-ink-muted">Saved items couldn&apos;t be loaded (they may have been removed).</p>
        : <ul className="space-y-1.5">{savedClaims.map((c) => <ClaimRow key={c.id} claim={c} />)}</ul>}
    </div>
  );
}

function SettingsPanel({ uid, displayName, bio, onSaved }: { uid: string; displayName: string; bio: string; onSaved: () => Promise<void> }) {
  const [dn, setDn] = useState(displayName);
  const [b, setB]   = useState(bio);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await updateProfile(uid, { displayName: dn, bio: b });
      await onSaved();
      setMsg("Saved.");
    } catch (e) {
      setMsg(safeErrorMessage(e));
    } finally { setBusy(false); setTimeout(() => setMsg(null), 2000); }
  }

  return (
    <div className="card p-4 space-y-3 max-w-md">
      <h3 className="text-[14px] font-bold text-ink">Profile settings</h3>
      <label className="block text-[12px] text-ink-muted">
        Display name
        <input
          type="text" maxLength={60} value={dn} onChange={(e) => setDn(e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[14px]"
        />
      </label>
      <label className="block text-[12px] text-ink-muted">
        Bio
        <textarea
          rows={3} maxLength={400} value={b} onChange={(e) => setB(e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[13px] resize-vertical"
        />
        <span className="text-[10.5px] text-ink-dim">{b.length}/400</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button" onClick={save} disabled={busy}
          className="text-[13px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-[12px] text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-[22px] font-bold text-ink leading-none">{value}</div>
      <div className="text-[12px] text-ink-muted">{label}</div>
    </div>
  );
}

function ClaimRow({ claim }: { claim: ClaimDoc }) {
  return (
    <div className="flex items-center gap-2 text-[13px] py-1">
      <Link href={`/community/${claim.id}`} className="text-link hover:underline truncate flex-1">{claim.title}</Link>
      <span className="text-[11px] text-ink-dim shrink-0">{claim.commentCount}c · {claim.evidenceCount}e</span>
    </div>
  );
}
