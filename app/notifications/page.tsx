import type { Metadata } from "next";
import NotificationsClient from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Proofbase notification center for evidence and collaboration updates.",
  alternates: { canonical: "/notifications" },
};

export default function NotificationsPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <NotificationsClient />
    </main>
  );
}
