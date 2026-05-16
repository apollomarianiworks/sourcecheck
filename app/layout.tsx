import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";
import PwaRegister from "@/components/pwa/PwaRegister";

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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/proofbase-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/proofbase-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/proofbase-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Proofbase",
    statusBarStyle: "default",
  },
  other: {
    "google-site-verification": "j4_BbYgYOc0PcXlbxi_1we4ULeSHV6DyV39vZllBaug",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#cc0000",
    "msapplication-config": "none",
  },
};

export const viewport: Viewport = {
  themeColor: "#cc0000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <PwaRegister />
        <TopNav />
        <div id="main">{children}</div>
      </body>
    </html>
  );
}
