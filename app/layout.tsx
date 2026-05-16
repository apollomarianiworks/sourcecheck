import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Proofbase - Research and debate operating system",
    template: "%s - Proofbase",
  },
  description:
    "Proofbase helps people research claims, compare evidence, inspect sources, and build better debates without pretending to know absolute truth.",
  applicationName: "Proofbase",
  keywords: ["research", "debate", "source quality", "misinformation", "evidence", "fact-checker"],
  authors: [{ name: "Proofbase" }],
  openGraph: {
    title: "Proofbase - Research and debate operating system",
    description: "Research claims, compare evidence, inspect sources, and understand uncertainty.",
    url: "/",
    siteName: "Proofbase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proofbase - Research and debate operating system",
    description: "Research claims, compare evidence, inspect sources, and understand uncertainty.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <TopNav />
        <div id="main">{children}</div>
      </body>
    </html>
  );
}
