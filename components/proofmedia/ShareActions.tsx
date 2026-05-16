"use client";

import { useState } from "react";
import { ActionStore } from "@/lib/proofmedia/engagement";
import { trackProofmediaEvent } from "@/lib/proofmedia/analytics";

interface Props {
  targetId: string;
  title: string;
  url: string;
  evidenceCount?: number;
}

export default function ShareActions({ targetId, title, url, evidenceCount = 0 }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(kind: "summary" | "sources" | "argument") {
    const text = kind === "sources"
      ? `${title}\n${url}\nEvidence attached: ${evidenceCount}`
      : kind === "argument"
        ? `Evidence-backed claim to review: ${title}\n\nOpen the Proofbase thread: ${url}`
        : `${title}\n\nReview the evidence and uncertainty on Proofbase: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      ActionStore.record("share", "claim", targetId, { kind });
      trackProofmediaEvent("share_clicked", { targetType: "claim", kind });
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied("failed");
      setTimeout(() => setCopied(null), 1600);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => copy("summary")} className="text-[11px] px-2 py-0.5 rounded border border-line hover:bg-section">
        Copy summary
      </button>
      <button type="button" onClick={() => copy("sources")} className="text-[11px] px-2 py-0.5 rounded border border-line hover:bg-section">
        Copy source list
      </button>
      <button type="button" onClick={() => copy("argument")} className="text-[11px] px-2 py-0.5 rounded border border-line hover:bg-section">
        Copy argument card
      </button>
      {copied && <span className="text-[11px] text-ink-muted">{copied === "failed" ? "Copy failed" : "Copied"}</span>}
    </div>
  );
}
