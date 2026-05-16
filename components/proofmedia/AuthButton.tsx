"use client";

import { useEffect, useState } from "react";
import { getLocalAccount, signInLocal, signOutLocal, subscribeLocalAccount, type LocalAccount } from "@/lib/auth/local";
import { isFirebaseConfigured, firebaseConfigGaps } from "@/lib/auth/firebase";
import Avatar from "./Avatar";

/**
 * Top-right Sign-in button. PASS 16 ships local-only sign-in — a tiny prompt
 * captures a display name and saves it in localStorage. When Firebase env is
 * configured later, the button can route to Google sign-in instead.
 */
export default function AuthButton() {
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setAccount(getLocalAccount());
    setMounted(true);
    return subscribeLocalAccount(setAccount);
  }, []);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const acc = signInLocal(name);
    setAccount(acc);
    setOpen(false);
  }

  if (!mounted) return <span className="text-[12px] text-ink-dim w-12" />;

  if (account) {
    return (
      <button
        type="button"
        onClick={() => {
          if (confirm("Sign out? Your locally saved claims/collections will stay on this device.")) {
            signOutLocal();
            setAccount(null);
          }
        }}
        className="flex items-center gap-1.5 text-[12px] px-1.5 py-1 rounded hover:bg-section"
        title={`Signed in locally as @${account.username}`}
      >
        <Avatar name={account.displayName} size={22} />
        <span className="text-ink-body hidden sm:inline">{account.displayName}</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[12px] px-2.5 py-1 rounded bg-brand hover:bg-brand-hover text-white"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 card p-3 z-50 space-y-2 text-[13px]">
          <div className="font-bold text-ink">Local sign-in</div>
          <p className="text-[12px] text-ink-muted leading-snug">
            Pick a display name. Everything stays in this browser. No email, no password,
            no server. {isFirebaseConfigured() ? "" : "Google sign-in not configured yet."}
          </p>
          <form onSubmit={handleSignIn} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={40}
              className="flex-1 px-2 py-1 border border-line rounded text-[13px]"
            />
            <button
              type="submit"
              disabled={name.trim().length < 1}
              className="text-[12px] bg-brand hover:bg-brand-hover text-white px-3 py-1 rounded disabled:opacity-40"
            >
              Sign in
            </button>
          </form>
          {!isFirebaseConfigured() && (
            <details className="text-[11px] text-ink-dim">
              <summary>Enable Google sign-in</summary>
              <p className="mt-1">
                Set these env vars and install firebase:{" "}
                <code className="bg-section px-1 rounded">{firebaseConfigGaps().join(", ")}</code>
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
