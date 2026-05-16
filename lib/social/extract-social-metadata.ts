import type { SocialMetadata } from "@/lib/types";
import { detectSocialUrl, type SocialUrlDetection } from "./detect-social-url";

const OEMBED_ENDPOINTS: Partial<Record<SocialMetadata["platform"], (url: string) => string>> = {
  youtube: (url) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  instagram: (url) => `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}`,
  "x-twitter": (url) => `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`,
  reddit: (url) => `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`,
};

interface OEmbedPayload {
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  thumbnail_url?: string;
  html?: string;
}

export async function extractSocialMetadata(rawUrl: string, timeoutMs = 5_000): Promise<SocialMetadata> {
  const detection = detectSocialUrl(rawUrl);
  if (!detection.isSocial) return baseMetadata(detection, false, "none", "Not a supported social URL.");

  const oembed = await fetchOEmbed(detection, timeoutMs);
  if (oembed) {
    const caption = (textFromHtml(oembed.html ?? "") || oembed.title) ?? null;
    return {
      ...baseMetadata(detection, true, "oembed", null),
      title: oembed.title ?? null,
      caption,
      likelyClaims: extractLikelyClaims(`${oembed.title ?? ""}. ${caption ?? ""}`),
      authorName: oembed.author_name ?? detection.username,
      authorUrl: oembed.author_url ?? null,
      thumbnailUrl: oembed.thumbnail_url ?? null,
      providerName: oembed.provider_name ?? providerName(detection.platform),
      limitations: [
        "Fetched through public oEmbed metadata only.",
        "Engagement counts are not used as credibility signals.",
        "Private, deleted, age-restricted, or login-gated content may not be available.",
      ],
    };
  }

  const html = await fetchPublicHtml(detection, timeoutMs);
  if (html) {
    const caption = meta(html, "og:description") ?? meta(html, "description");
    return {
      ...baseMetadata(detection, true, "html-metadata", null),
      title: meta(html, "og:title") ?? title(html),
      caption,
      likelyClaims: extractLikelyClaims(`${meta(html, "og:title") ?? title(html) ?? ""}. ${caption ?? ""}`),
      authorName: detection.username,
      authorUrl: detection.username ? authorUrl(detection) : null,
      publishedAt: meta(html, "article:published_time") ?? null,
      thumbnailUrl: meta(html, "og:image"),
      providerName: meta(html, "og:site_name") ?? providerName(detection.platform),
      limitations: [
        "Fetched public HTML metadata only.",
        "The post body may be incomplete if the platform requires JavaScript or login.",
        "No private or restricted content was accessed.",
      ],
    };
  }

  return {
    ...baseMetadata(detection, false, "none", "Public metadata was not accessible without login or platform permission."),
    limitations: [
      "No private or logged-in content was accessed.",
      "Use the claim text, visible caption, author, and date if you can provide them.",
    ],
  };
}

function baseMetadata(
  detection: SocialUrlDetection,
  fetched: boolean,
  fetchMethod: SocialMetadata["fetchMethod"],
  errorMessage: string | null
): SocialMetadata {
  return {
    platform: detection.platform,
    url: detection.url,
    canonicalUrl: detection.canonicalUrl,
    username: detection.username,
    postId: detection.postId,
    videoId: detection.videoId,
    title: null,
    caption: null,
    likelyClaims: [],
    authorName: detection.username,
    authorUrl: detection.username ? authorUrl(detection) : null,
    publishedAt: null,
    thumbnailUrl: null,
    providerName: providerName(detection.platform),
    fetched,
    fetchMethod,
    limitations: [],
    errorMessage,
  };
}

async function fetchOEmbed(detection: SocialUrlDetection, timeoutMs: number): Promise<OEmbedPayload | null> {
  const endpoint = OEMBED_ENDPOINTS[detection.platform];
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint(detection.canonicalUrl), {
      headers: { Accept: "application/json", "User-Agent": "ProofbaseBot/1.0 public metadata checker" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as OEmbedPayload;
  } catch {
    return null;
  }
}

async function fetchPublicHtml(detection: SocialUrlDetection, timeoutMs: number): Promise<string | null> {
  if (detection.platform === "facebook" || detection.platform === "instagram" || detection.platform === "threads") return null;
  try {
    const res = await fetch(detection.canonicalUrl, {
      headers: { Accept: "text/html,*/*;q=0.5", "User-Agent": "ProofbaseBot/1.0 public metadata checker" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 500_000);
  } catch {
    return null;
  }
}

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegExp(key)}["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegExp(key)}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decode(match[1]);
  }
  return null;
}

function title(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decode(stripTags(match[1])) : null;
}

function textFromHtml(html: string): string | null {
  const cleaned = decode(stripTags(html)).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function providerName(platform: SocialMetadata["platform"]): string | null {
  const labels: Record<SocialMetadata["platform"], string> = {
    youtube: "YouTube",
    tiktok: "TikTok",
    instagram: "Instagram",
    "x-twitter": "X/Twitter",
    facebook: "Facebook",
    reddit: "Reddit",
    threads: "Threads",
    unknown: "Unknown",
  };
  return labels[platform] ?? null;
}

function authorUrl(detection: SocialUrlDetection): string | null {
  if (!detection.username) return null;
  if (detection.platform === "youtube") return `https://www.youtube.com/${detection.username}`;
  if (detection.platform === "tiktok") return `https://www.tiktok.com/${detection.username}`;
  if (detection.platform === "x-twitter") return `https://x.com/${detection.username.replace(/^@/, "")}`;
  if (detection.platform === "threads") return `https://www.threads.net/${detection.username}`;
  if (detection.platform === "instagram") return `https://www.instagram.com/${detection.username.replace(/^@/, "")}`;
  return null;
}

function extractLikelyClaims(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) =>
      part.length >= 25 &&
      /\b(is|are|was|were|will|causes?|caused|proves?|shows?|illegal|fake|scam|study|report|arrested|lawsuit|cure|kills?)\b/i.test(part)
    )
    .slice(0, 4);
}
