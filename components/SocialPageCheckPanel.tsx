"use client";

import type { SourceMeshReport } from "@/lib/types";

interface Props {
  report: SourceMeshReport | undefined;
}

export default function SocialPageCheckPanel({ report }: Props) {
  const social = report?.social;
  if (!social) return null;
  const m = social.metadata;
  const s = social.sourceQuality;

  return (
    <div className="card p-3.5 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Social page check</div>
        <span className="text-[12px] px-2 py-0.5 rounded bg-section text-ink-body">{m.platform}</span>
      </div>

      <div className="text-[13px] text-ink-body leading-relaxed">
        Social source quality: <strong>{s.label}</strong> ({s.score}/100). {social.claimEvidenceNote}
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
        <Row label="Fetch method" value={m.fetchMethod} />
        <Row label="Public metadata" value={m.fetched ? "available" : "not available"} />
        <Row label="Author" value={m.authorName ?? m.username ?? "unknown"} />
        <Row label="Post/video ID" value={m.postId ?? m.videoId ?? "not detected"} />
        <Row label="Title" value={m.title ?? "not available"} />
        <Row label="Date" value={m.publishedAt ?? "not available"} />
      </dl>

      {m.errorMessage && <div className="text-[12px] text-verdict-amber">{m.errorMessage}</div>}

      {m.likelyClaims.length > 0 && (
        <div className="border border-line-soft rounded p-2">
          <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">Likely claim text</div>
          <ul className="text-[12px] text-ink-body space-y-1 list-disc pl-5">
            {m.likelyClaims.map((claim) => <li key={claim}>{claim}</li>)}
          </ul>
        </div>
      )}

      <details className="text-[12px]">
        <summary className="text-link hover:underline">Social score factors</summary>
        <ul className="mt-2 space-y-1">
          {s.factors.map((factor) => (
            <li key={`${factor.label}-${factor.delta}`} className="flex gap-2">
              <span className={factor.delta >= 0 ? "text-verdict-green" : "text-verdict-red"}>{factor.delta >= 0 ? "+" : ""}{factor.delta}</span>
              <span className="text-ink-body">{factor.label}: {factor.detail}</span>
            </li>
          ))}
        </ul>
      </details>

      <ul className="text-[11.5px] text-ink-muted list-disc pl-5 space-y-1">
        {m.limitations.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-soft rounded p-2 bg-section/40 min-w-0">
      <dt className="text-[10px] text-ink-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-ink-body truncate" title={value}>{value}</dd>
    </div>
  );
}
