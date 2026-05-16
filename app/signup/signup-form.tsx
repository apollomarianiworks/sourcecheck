"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-hook";
import { isFirebaseConfigured, firebaseMissingEnv } from "@/lib/firebase/client";
import { safeErrorMessage } from "@/lib/security/guard";
import { validateDisplayName } from "@/lib/security/validators";

export default function SignupForm() {
  const { status, signUpEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/community";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="card p-3 bg-section text-[12px] text-ink-body">
        <div className="font-bold mb-1">Firebase not configured.</div>
        <p>Add the following keys to <code>.env.local</code> and restart:</p>
        <ul className="font-mono text-[11.5px] mt-1">{firebaseMissingEnv().map((k) => <li key={k}>{k}</li>)}</ul>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) { setError("You must agree to the basics to participate."); return; }
    const name = validateDisplayName(displayName);
    if (!name.ok) { setError(name.message ?? "Invalid display name."); return; }
    setError(null); setBusy(true);
    try {
      await signUpEmail(email, password, displayName);
      router.replace(next);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally { setBusy(false); }
  }

  async function google() {
    if (!agree) { setError("You must agree to the basics to participate."); return; }
    setError(null); setBusy(true);
    try {
      await signInGoogle();
      router.replace(next);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <button
        type="button" onClick={google} disabled={busy}
        className="w-full flex items-center justify-center gap-2 text-[14px] px-3 py-2 rounded border border-line bg-page hover:bg-section disabled:opacity-50"
      >
        <span aria-hidden="true" className="font-bold">G</span>
        Continue with Google
      </button>

      <div className="text-[11px] text-ink-dim text-center">or with email</div>

      <form onSubmit={submit} className="space-y-2">
        <label className="block text-[12px] text-ink-muted">
          Display name
          <input
            type="text" required autoComplete="name" maxLength={60} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[14px]"
          />
        </label>
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
            type="password" required autoComplete="new-password" minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 border border-line rounded text-[14px]"
          />
          <span className="text-[10.5px] text-ink-dim">At least 6 characters.</span>
        </label>
        <label className="flex items-start gap-2 text-[12px] text-ink-body">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
          <span>I agree to post evidence-grounded content, attach real sources, and accept that violations may lead to my content being removed.</span>
        </label>
        {error && <div className="text-[12px] text-verdict-red">{error}</div>}
        <button
          type="submit" disabled={busy || !agree}
          className="w-full text-[14px] bg-brand hover:bg-brand-hover text-white px-3 py-2 rounded disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="text-[12px] text-ink-muted text-center">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-link hover:underline">Sign in →</Link>
      </div>
    </div>
  );
}
