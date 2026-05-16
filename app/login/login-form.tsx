"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-hook";
import { isFirebaseConfigured, firebaseMissingEnv } from "@/lib/firebase/client";
import { safeErrorMessage } from "@/lib/security/guard";

export default function LoginForm() {
  const { status, signInEmail, signInGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/community";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-ink-body">
          Firebase isn&apos;t configured in this environment.
        </p>
        <div className="card p-3 bg-section text-[12px] text-ink-body">
          <div className="font-bold mb-1">Add these to your <code>.env.local</code>:</div>
          <ul className="font-mono text-[11.5px] space-y-0.5">
            {firebaseMissingEnv().map((k) => <li key={k}>{k}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInEmail(email, password);
      router.replace(next);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle();
      router.replace(next);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email.trim()) { setError("Enter your email first."); return; }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setError("Password reset email sent if the account exists.");
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 text-[14px] px-3 py-2 rounded border border-line bg-page hover:bg-section disabled:opacity-50"
      >
        <span aria-hidden="true" className="font-bold">G</span>
        Continue with Google
      </button>

      <div className="text-[11px] text-ink-dim text-center">or with email</div>

      <form onSubmit={submit} className="space-y-2">
        <label className="block text-[12px] text-ink-muted">
          Email
          <input
            type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[14px]"
          />
        </label>
        <label className="block text-[12px] text-ink-muted">
          Password
          <input
            type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[14px]"
          />
        </label>
        <button type="button" onClick={forgotPassword} disabled={busy} className="text-[12px] text-link hover:underline">
          Forgot password?
        </button>
        {error && <div className="text-[12px] text-verdict-red">{error}</div>}
        <button
          type="submit" disabled={busy}
          className="w-full text-[14px] bg-brand hover:bg-brand-hover text-white px-3 py-2 rounded disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="text-[12px] text-ink-muted text-center">
        No account? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-link hover:underline">Create one →</Link>
      </div>
    </div>
  );
}
