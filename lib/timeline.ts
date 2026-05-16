import type { EvidenceItem } from "./types";

export interface TimelineBucket {
  period: string;            // "2024-01", "2024-W12", "2024" — granularity adapts
  count: number;
  earliest: string;          // ISO date
  latest: string;
  topTitles: string[];       // up to 3
}

export interface Timeline {
  granularity: "year" | "month" | "week";
  buckets: TimelineBucket[]; // sorted oldest → newest
  earliestDate: string | null;
  latestDate: string | null;
  totalDatedItems: number;
}

/**
 * Build a date histogram from the dated items in `evidence`.
 * Granularity auto-selects so we always get 3–12 buckets.
 */
export function buildTimeline(evidence: EvidenceItem[]): Timeline {
  const dated = evidence
    .map((e) => ({ item: e, t: e.date ? Date.parse(e.date) : NaN }))
    .filter((x) => !Number.isNaN(x.t));

  if (dated.length === 0) {
    return {
      granularity: "month",
      buckets: [],
      earliestDate: null,
      latestDate: null,
      totalDatedItems: 0,
    };
  }

  dated.sort((a, b) => a.t - b.t);
  const earliest = dated[0].t;
  const latest = dated[dated.length - 1].t;
  const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);

  let gran: Timeline["granularity"];
  if (spanDays > 365 * 3)      gran = "year";
  else if (spanDays > 60)      gran = "month";
  else                          gran = "week";

  const bucketMap = new Map<string, { items: typeof dated; earliestT: number; latestT: number }>();
  for (const { item, t } of dated) {
    const key = bucketKey(new Date(t), gran);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { items: [], earliestT: t, latestT: t });
    }
    const entry = bucketMap.get(key)!;
    entry.items.push({ item, t });
    if (t < entry.earliestT) entry.earliestT = t;
    if (t > entry.latestT) entry.latestT = t;
  }

  const buckets: TimelineBucket[] = Array.from(bucketMap.entries())
    .map(([period, { items, earliestT, latestT }]) => ({
      period,
      count: items.length,
      earliest: new Date(earliestT).toISOString().slice(0, 10),
      latest: new Date(latestT).toISOString().slice(0, 10),
      topTitles: items.slice(0, 3).map(({ item }) => item.title),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    granularity: gran,
    buckets,
    earliestDate: new Date(earliest).toISOString().slice(0, 10),
    latestDate: new Date(latest).toISOString().slice(0, 10),
    totalDatedItems: dated.length,
  };
}

function bucketKey(d: Date, gran: Timeline["granularity"]): string {
  const y = d.getUTCFullYear();
  if (gran === "year") return String(y);
  if (gran === "month") {
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  // ISO week
  const tmp = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
