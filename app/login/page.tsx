import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to ProofMedia — post claims, save evidence, vote, and participate in debates.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-10">
      <div className="max-w-sm mx-auto card p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-[22px] font-bold text-ink">Sign in</h1>
          <p className="text-[13px] text-ink-muted">Welcome back. Use Google or email + password.</p>
        </header>
        <Suspense fallback={<div className="text-[13px] text-ink-muted">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
