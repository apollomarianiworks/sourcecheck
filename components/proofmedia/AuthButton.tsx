"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-hook";
import { isFirebaseConfigured, firebaseMissingEnv } from "@/lib/firebase/client";
import Avatar from "./Avatar";

/**
 * Top-right auth button — Firebase-aware.
 *
 *  - Not configured → shows a "setup needed" chip with the missing env vars in title.
 *  - Loading → blank.
 *  - Signed out → Sign in / Sign up.
 *  - Signed in → avatar + dropdown to profile / saved / sign out.
 */
export default function AuthButton() {
  const { status, user, profile, signOutNow } = useAuth();
  const [open, setOpen] = useState(false);

  if (status === "not-configured") {
    return (
      <span
        title={`Missing env: ${firebaseMissingEnv().join(", ")}`}
        className="text-[11px] text-ink-muted hidden sm:inline-block px-2 py-1 border border-line rounded"
      >
        Auth: setup needed
      </span>
    );
  }

  if (status === "loading") {
    return <span className="text-[12px] text-ink-dim w-12 inline-block" aria-hidden="true">&nbsp;</span>;
  }

  if (status === "signed-out") {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="text-[12px] px-2.5 py-1 rounded border border-line text-ink-body hover:bg-section no-underline"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="text-[12px] px-2.5 py-1 rounded bg-brand hover:bg-brand-hover text-white no-underline"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const name = profile?.displayName ?? user?.displayName ?? "You";
  const username = profile?.username ?? (user?.uid.slice(0, 6) ?? "you");
  const photo = profile?.photoURL ?? user?.photoURL ?? null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[12px] px-1.5 py-1 rounded hover:bg-section"
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
      >
        <Avatar name={name} src={photo} size={24} />
        <span className="text-ink-body hidden sm:inline">{name}</span>
        <span aria-hidden="true" className="text-ink-dim">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-56 card p-2 z-50 space-y-1 text-[13px]">
          <div className="px-2 py-1 text-[11px] text-ink-muted">@{username}</div>
          <Link href={`/profile/${username}`} onClick={() => setOpen(false)} className="block px-2 py-1.5 rounded hover:bg-section no-underline text-ink">My profile</Link>
          <Link href="/profile?tab=saved"    onClick={() => setOpen(false)} className="block px-2 py-1.5 rounded hover:bg-section no-underline text-ink">Saved items</Link>
          <Link href="/community"            onClick={() => setOpen(false)} className="block px-2 py-1.5 rounded hover:bg-section no-underline text-ink">Community feed</Link>
          <button
            type="button"
            onClick={async () => { await signOutNow(); setOpen(false); }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-section text-verdict-red"
          >
            Sign out
          </button>
          {!isFirebaseConfigured() && (
            <div className="text-[11px] text-ink-dim px-2 pt-1">Firebase setup pending.</div>
          )}
        </div>
      )}
    </div>
  );
}
