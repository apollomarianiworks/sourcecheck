import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  const routes = ["", "/community", "/debate", "/debates", "/collections", "/routines", "/pricing", "/how-it-works", "/limitations", "/compare", "/explorer", "/data-sources", "/history"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : 0.6,
  }));
}
