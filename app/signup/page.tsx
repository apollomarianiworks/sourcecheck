import type { Metadata } from "next";
import { Suspense } from "react";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Proofbase / ProofMedia account. Free, no payment, no follower system — just evidence.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-10">
      <div className="max-w-sm mx-auto card p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-[22px] font-bold text-ink">Create your account</h1>
          <p className="text-[13px] text-ink-muted">Free. No follower system. No payments. Evidence-first.</p>
        </header>
        <Suspense fallback={<div className="text-[13px] text-ink-muted">Loading…</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
