import type { Metadata } from "next";
import ProfileView from "./profile-view";

export const metadata: Metadata = {
  title: "Research profile",
  description: "Local research profile — claims, evidence contributions, debates, and saved collections for a single user. Local-only in PASS 16.",
};

interface Props { params: Promise<{ username: string }>; }

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <ProfileView username={username} />
    </main>
  );
}
