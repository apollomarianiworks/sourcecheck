"use client";

import type { CheckResult } from "@/lib/types";

interface Spec {
  label: string;
  blurb: string;
  pill: string;
  dot: string;
  border: string;
  bg: string;
  text: string;
}

const SPECS: Record<CheckResult["evidenceVerdict"], Spec> = {
  supports: {
    label: "Evidence suggests this is supported",
    blurb: "Multiple reputable sources report findings consistent with the claim. This is not a guarantee of truth — review the sources below.",
    pill:  "Supported",
    dot:   "bg-verdict-green",
    border:"border-verdict-green/60",
    bg:    "bg-verdict-greenSoft",
    text:  "text-verdict-green",
  },
  disputes: {
    label: "Evidence suggests this is disputed",
    blurb: "Fact-checkers on balance rated the matching claim as false, misleading, or unsupported. This is not a guarantee of falsehood — review the sources below.",
    pill:  "Disputed",
    dot:   "bg-verdict-red",
    border:"border-verdict-red/60",
    bg:    "bg-verdict-redSoft",
    text:  "text-verdict-red",
  },
  mixed: {
    label: "Conflicting reports detected",
    blurb: "Reviewers reached different conclusions. The claim likely depends on how it is phrased or framed.",
    pill:  "Mixed / Misleading",
    dot:   "bg-verdict-amber",
    border:"border-verdict-amber/60",
    bg:    "bg-verdict-amberSoft",
    text:  "text-verdict-amber",
  },
  "related-only": {
    label: "Limited evidence found",
    blurb: "No fact-checker has rated this exact phrasing. Related coverage exists but does not constitute a verdict.",
    pill:  "Unverified",
    dot:   "bg-verdict-gray",
    border:"border-line",
    bg:    "bg-verdict-graySoft",
    text:  "text-verdict-gray",
  },
  none: {
    label: "Limited evidence found",
    blurb: "No items returned from any consulted source. Absence of coverage is not a verdict.",
    pill:  "No evidence",
    dot:   "bg-verdict-gray",
    border:"border-line",
    bg:    "bg-verdict-graySoft",
    text:  "text-verdict-gray",
  },
};

interface Props {
  verdict: CheckResult["evidenceVerdict"];
  size?: "sm" | "lg";
}

export default function VerdictBadge({ verdict, size = "lg" }: Props) {
  const s = SPECS[verdict];

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] border ${s.border} ${s.bg} ${s.text}`}
        role="status"
        aria-label={`Verdict: ${s.label}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
        <span className="font-medium">{s.pill}</span>
      </span>
    );
  }

  return (
    <div
      className={`border ${s.border} ${s.bg} rounded-md p-4`}
      role="status"
      aria-label={`Verdict: ${s.label}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`inline-block w-2 h-2 rounded-full ${s.dot} mt-1`} aria-hidden="true" />
        <span className={`text-base font-bold ${s.text}`}>{s.label}</span>
      </div>
      <p className="text-[13px] text-ink-body leading-relaxed mt-1.5">
        {s.blurb}
      </p>
    </div>
  );
}
