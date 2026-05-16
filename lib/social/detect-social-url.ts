import type { SocialMetadata } from "@/lib/types";

export type SocialPlatform = SocialMetadata["platform"];

export interface SocialUrlDetection {
  isSocial: boolean;
  platform: SocialPlatform;
  url: string;
  canonicalUrl: string;
  username: string | null;
  postId: string | null;
  videoId: string | null;
}

const PLATFORM_HOSTS: { platform: SocialPlatform; hosts: string[] }[] = [
  { platform: "youtube", hosts: ["youtube.com", "youtu.be", "m.youtube.com", "www.youtube.com"] },
  { platform: "tiktok", hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"] },
  { platform: "instagram", hosts: ["instagram.com", "www.instagram.com"] },
  { platform: "x-twitter", hosts: ["x.com", "twitter.com", "mobile.twitter.com", "www.x.com", "www.twitter.com"] },
  { platform: "facebook", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"] },
  { platform: "reddit", hosts: ["reddit.com", "www.reddit.com", "old.reddit.com", "redd.it"] },
  { platform: "threads", hosts: ["threads.net", "www.threads.net"] },
];

export function detectSocialUrl(raw: string): SocialUrlDetection {
  const parsed = parsePublicUrl(raw);
  if (!parsed) return empty(raw);

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const matched = PLATFORM_HOSTS.find((p) => p.hosts.some((h) => host === h.replace(/^www\./, "")));
  if (!matched) return empty(raw);

  const parts = parsed.pathname.split("/").filter(Boolean);
  const platform = matched.platform;
  const ids = extractIds(platform, parsed, parts);
  const canonicalUrl = buildCanonical(platform, parsed, ids);

  return {
    isSocial: true,
    platform,
    url: parsed.toString(),
    canonicalUrl,
    username: ids.username,
    postId: ids.postId,
    videoId: ids.videoId,
  };
}

function parsePublicUrl(raw: string): URL | null {
  const candidate = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function empty(raw: string): SocialUrlDetection {
  return {
    isSocial: false,
    platform: "unknown",
    url: raw,
    canonicalUrl: raw,
    username: null,
    postId: null,
    videoId: null,
  };
}

function extractIds(
  platform: SocialPlatform,
  url: URL,
  parts: string[]
): Pick<SocialUrlDetection, "username" | "postId" | "videoId"> {
  if (platform === "youtube") {
    if (url.hostname.includes("youtu.be")) return { username: null, postId: null, videoId: parts[0] ?? null };
    if (url.searchParams.get("v")) return { username: null, postId: null, videoId: url.searchParams.get("v") };
    if (parts[0] === "shorts" || parts[0] === "embed") return { username: null, postId: null, videoId: parts[1] ?? null };
    if (parts[0]?.startsWith("@")) return { username: parts[0], postId: parts[1] ?? null, videoId: null };
  }

  if (platform === "tiktok") {
    return {
      username: parts.find((p) => p.startsWith("@")) ?? null,
      postId: parts[0] === "video" ? parts[1] ?? null : parts[2] ?? null,
      videoId: parts.includes("video") ? parts[parts.indexOf("video") + 1] ?? null : null,
    };
  }

  if (platform === "instagram") {
    const marker = ["p", "reel", "reels", "tv"].find((m) => parts.includes(m));
    return {
      username: marker ? null : parts[0] ?? null,
      postId: marker ? parts[parts.indexOf(marker) + 1] ?? null : null,
      videoId: null,
    };
  }

  if (platform === "x-twitter") {
    const statusIndex = parts.findIndex((p) => p === "status" || p === "statuses");
    return {
      username: statusIndex > 0 ? parts[statusIndex - 1] : parts[0] ?? null,
      postId: statusIndex >= 0 ? parts[statusIndex + 1] ?? null : null,
      videoId: null,
    };
  }

  if (platform === "facebook") {
    return {
      username: parts[0] ?? null,
      postId: url.searchParams.get("fbid") ?? url.searchParams.get("story_fbid") ?? parts.find((p) => /^\d{8,}$/.test(p)) ?? null,
      videoId: parts[0] === "watch" ? url.searchParams.get("v") : null,
    };
  }

  if (platform === "reddit") {
    if (url.hostname.includes("redd.it")) return { username: null, postId: parts[0] ?? null, videoId: null };
    const commentsIndex = parts.indexOf("comments");
    return {
      username: null,
      postId: commentsIndex >= 0 ? parts[commentsIndex + 1] ?? null : null,
      videoId: null,
    };
  }

  if (platform === "threads") {
    const postIndex = parts.indexOf("post");
    return {
      username: parts.find((p) => p.startsWith("@")) ?? parts[0] ?? null,
      postId: postIndex >= 0 ? parts[postIndex + 1] ?? null : null,
      videoId: null,
    };
  }

  return { username: null, postId: null, videoId: null };
}

function buildCanonical(platform: SocialPlatform, url: URL, ids: Pick<SocialUrlDetection, "username" | "postId" | "videoId">): string {
  if (platform === "youtube" && ids.videoId) return `https://www.youtube.com/watch?v=${ids.videoId}`;
  if (platform === "tiktok" && ids.username && ids.videoId) return `https://www.tiktok.com/${ids.username}/video/${ids.videoId}`;
  if (platform === "x-twitter" && ids.username && ids.postId) return `https://x.com/${ids.username}/status/${ids.postId}`;
  if (platform === "reddit" && ids.postId) return url.toString().replace(/\?.*$/, "");
  return url.toString();
}
