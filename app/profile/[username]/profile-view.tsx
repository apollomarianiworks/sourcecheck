"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection, query, where, getDocs, limit,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { readClaimsByAuthor, type ClaimDoc } from "@/lib/community/firestore";
import { readProfile, type UserProfile } from "@/lib/firebase/user-profile";
import { buildReputationSnapshot } from "@/lib/proofmedia/reputation";
import Avatar from "@/components/proofmedia/Avatar";
import ReputationPanel from "@/components/proofmedia/ReputationPanel";

interface Props { username: string; }

export default function ProfileView({ username }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claims, setClaims]   = useState<ClaimDoc[]>([]);
  const [status, setStatus]   = useState<"loading" | "ready" | "not-found" | "not-configured">("loading");

  useEffect(() => {
    if (!isFirebaseConfigured()) { setStatus("not-configured"); return; }
    const db = getFirebaseDb();
    if (!db) { setStatus("not-configured"); return; }
    (async () => {
      try {
        // Look up user by username
        const q = query(collection(db, "users"), where("username", "==", username), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) { setStatus("not-found"); return; }
        const uid = snap.docs[0].id;
        const [p, c] = await Promise.all([
          readProfile(uid),
          readClaimsByAuthor(uid).catch(() => [] as ClaimDoc[]),
        ]);
        if (!p) { setStatus("not-found"); return; }
        setProfile(p);
        setClaims(c);
        setStatus("ready");
      } catch {
        setStatus("not-found");
      }
    })();
  }, [username]);

  if (status === "loading")
    return <div className="card p-6 text-[13px] text-ink-muted">Loading profile…</div>;

  if (status === "not-configured")
    return (
      <div className="card p-6 space-y-2">
        <h2 className="text-[16px] font-bold text-ink">Profiles unavailable</h2>
        <p className="text-[13px] text-ink-muted">Firebase isn&apos;t configured. Public profiles can&apos;t be loaded.</p>
      </div>
    );

  if (status === "not-found")
    return (
      <div className="card p-6 space-y-3 text-center">
        <h2 className="text-[16px] font-bold text-ink">@{username} not found</h2>
        <p className="text-[13px] text-ink-muted">No public profile with that username on this Proofbase instance.</p>
        <Link href="/community" className="inline-block bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded text-[13px] no-underline">Browse community →</Link>
      </div>
    );

  if (!profile) return null;
  const reputation = buildReputationSnapshot({ claims });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 lg:gap-8">
      <div className="space-y-3 lg:sticky lg:top-16 self-start">
        <div className="card p-4 space-y-2">
          <div className="h-24 rounded bg-[linear-gradient(135deg,#1a1a1a,#cc0000)]" aria-hidden="true" />
          <Avatar name={profile.displayName} src={profile.photoURL} size={64} />
          <div>
            <h1 className="text-[18px] font-bold text-ink">{profile.displayName}</h1>
            <div className="text-[12px] text-ink-muted">@{profile.username}</div>
            <div className="text-[11px] text-ink-dim">joined {profile.createdAt.slice(0, 10)}</div>
          </div>
          {profile.bio && <p className="text-[13px] text-ink-body leading-relaxed">{profile.bio}</p>}
          <div className="flex flex-wrap gap-1.5">
            {(reputation.topTopics.length ? reputation.topTopics : ["research", "evidence"]).slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full border border-line bg-soft px-2 py-1 text-[11px] text-ink-muted">{tag}</span>
            ))}
          </div>
          <div className="rounded border border-line-soft bg-soft px-2 py-1.5 text-[11px] text-ink-muted">
            Verification placeholder: no public verification is claimed yet.
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] border-t border-line-soft pt-2">
            <div><strong className="text-ink">{claims.length}</strong> <span className="text-ink-muted">claims</span></div>
            <div><strong className="text-ink">{claims.reduce((s, c) => s + c.evidenceCount, 0)}</strong> <span className="text-ink-muted">evidence</span></div>
            <div><strong className="text-ink">{profile.reputationScore}</strong> <span className="text-ink-muted">rep</span></div>
            <div><strong className="text-ink capitalize">{profile.role}</strong> <span className="text-ink-muted">role</span></div>
          </div>
          {profile.restrictions.length > 0 && (
            <div className="text-[11px] text-verdict-amber border-t border-line-soft pt-2">
              Restrictions on this account: {profile.restrictions.join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        <ReputationPanel snapshot={reputation} />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProfileStat label="Helpful rating" value={reputation.helpfulRating} />
          <ProfileStat label="Sources cited" value={reputation.metrics.sourcesCited} />
          <ProfileStat label="Profile views" value={reputation.metrics.profileViewsPlaceholder} />
        </section>
        <h2 className="text-[15px] font-bold text-ink">Claims ({claims.length})</h2>
        {claims.length === 0 ? (
          <div className="card p-6 text-center text-[13px] text-ink-muted">
            @{profile.username} hasn&apos;t posted any public claims yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {claims.map((c) => (
              <li key={c.id} className="card p-3 hover:border-ink-deep transition-colors">
                <Link href={`/community/${c.id}`} className="block">
                  <div className="text-[15px] font-bold text-ink hover:underline">{c.title}</div>
                  {c.body && <p className="text-[12.5px] text-ink-body line-clamp-2 mt-0.5">{c.body}</p>}
                </Link>
                <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-section text-ink-body">{c.category.replace(/-/g, " ")}</span>
                  <span>{c.evidenceCount} evidence · {c.commentCount} comments</span>
                  <span className="ml-auto">{c.createdAt.slice(0, 10)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-[22px] font-bold text-ink">{value}</div>
      <div className="text-[12px] text-ink-muted">{label}</div>
    </div>
  );
}
