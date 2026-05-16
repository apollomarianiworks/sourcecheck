import type { Metadata } from "next";
import { Suspense } from "react";
import ProfileSelfRoute from "./profile-self";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your Proofbase profile — claims, saved evidence, and account settings.",
  alternates: { canonical: "/profile" },
};

export default function ProfileSelfPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <Suspense fallback={<div className="text-[13px] text-ink-muted">Loading…</div>}>
        <ProfileSelfRoute />
      </Suspense>
    </main>
  );
}
