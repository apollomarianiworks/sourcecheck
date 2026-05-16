import type { SocialMetadata, SocialScore } from "@/lib/types";

const OFFICIAL_HINTS = /\b(official|gov|government|agency|department|university|press|newsroom|verified)\b/i;
const RUMOR_HINTS = /\b(rumor|apparently|unconfirmed|leaked|they say|someone said|repost|forwarded|screenshot)\b/i;
const CITATION_HINTS = /\bhttps?:\/\/|source:|according to|court filing|press release|study|report|doi:|pubmed|sec\.gov|cdc\.gov|fda\.gov/i;

export function scoreSocialSource(metadata: SocialMetadata, claimText = ""): SocialScore {
  const factors: SocialScore["factors"] = [];
  const warnings: string[] = [];
  let score = 35;

  if (metadata.fetched) {
    score += 10;
    factors.push({ label: "Public metadata accessible", delta: 10, detail: `${metadata.fetchMethod} metadata was available without login.` });
  } else {
    score -= 15;
    factors.push({ label: "Metadata unavailable", delta: -15, detail: metadata.errorMessage ?? "No public metadata could be fetched." });
  }

  if (metadata.authorName || metadata.username) {
    score += 8;
    factors.push({ label: "Identifiable account", delta: 8, detail: `Author signal: ${metadata.authorName ?? metadata.username}.` });
  } else {
    score -= 12;
    warnings.push("Anonymous or unclear account identity.");
    factors.push({ label: "Anonymous source", delta: -12, detail: "No public author or username was available." });
  }

  const combined = `${metadata.title ?? ""} ${metadata.caption ?? ""} ${claimText}`;
  if (OFFICIAL_HINTS.test(`${metadata.authorName ?? ""} ${metadata.username ?? ""}`)) {
    score += 12;
    factors.push({ label: "Official-account signal", delta: 12, detail: "Public account text contains official/transparency wording." });
  }

  if (CITATION_HINTS.test(combined)) {
    score += 12;
    factors.push({ label: "External citation signal", delta: 12, detail: "The visible text appears to reference outside sources or documents." });
  } else {
    score -= 6;
    factors.push({ label: "No visible citations", delta: -6, detail: "No public external citation was visible in the metadata." });
  }

  if (RUMOR_HINTS.test(combined)) {
    score -= 15;
    warnings.push("Rumor/repost/screenshot language detected.");
    factors.push({ label: "Rumor warning", delta: -15, detail: "The visible text contains rumor, repost, leak, or screenshot language." });
  }

  if (/\b(deepfake|ai generated|voice clone|synthetic|edited video)\b/i.test(combined)) {
    score -= 8;
    warnings.push("AI/deepfake claims need independent media-forensics or primary-source evidence.");
    factors.push({ label: "Media manipulation claim", delta: -8, detail: "Social metadata alone cannot verify edited or synthetic media." });
  }

  if (/\b(cure|treatment|dose|vaccine|cancer|death|arrested|lawsuit|illegal|stock|crypto|scam)\b/i.test(combined)) {
    score -= 5;
    factors.push({ label: "High-stakes claim type", delta: -5, detail: "Health, legal, finance, and crime claims need primary corroboration." });
  }

  score = Math.max(0, Math.min(100, score));
  const label: SocialScore["label"] = score >= 70 ? "strong" : score >= 50 ? "moderate" : score >= 25 ? "weak" : "unknown";

  return {
    score,
    label,
    factors,
    warnings: [
      ...warnings,
      "Engagement is not used as credibility.",
      "Screenshots and reposts are weak evidence unless independently corroborated.",
    ],
  };
}
