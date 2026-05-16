import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SourceCheck — Check claims, inspect sources, compare evidence",
    template: "%s · SourceCheck",
  },
  description:
    "A free, public source-quality scanner. Cross-references the Google Fact Check Tools API, GDELT news archive, Wikipedia, and a local source-reputation database. Not a truth detector — a transparency layer.",
  applicationName: "SourceCheck",
  keywords: ["fact check", "source quality", "misinformation", "GDELT", "Wikipedia", "fact-checker"],
  authors: [{ name: "SourceCheck" }],
  openGraph: {
    title: "SourceCheck — Check claims, inspect sources, compare evidence",
    description: "A free, public source-quality scanner. Not a truth detector — a transparency layer.",
    url: "/",
    siteName: "SourceCheck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SourceCheck",
    description: "Check claims, inspect sources, compare evidence from public data.",
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
