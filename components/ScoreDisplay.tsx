"use client";

interface Props {
  score: number | null;
}

function band(score: number): { label: string; text: string; bar: string } {
  if (score >= 85) return { label: "High credibility",     text: "text-verdict-green", bar: "bg-verdict-green" };
  if (score >= 70) return { label: "Good credibility",     text: "text-verdict-green", bar: "bg-verdict-green" };
  if (score >= 55) return { label: "Moderate credibility", text: "text-verdict-amber", bar: "bg-verdict-amber" };
  if (score >= 40) return { label: "Low credibility",      text: "text-verdict-amber", bar: "bg-verdict-amber" };
  return                  { label: "Very low credibility", text: "text-verdict-red",   bar: "bg-verdict-red" };
}

export default function ScoreDisplay({ score }: Props) {
  if (score === null) {
    return (
      <div className="card p-3.5 space-y-1">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Source Quality Score</div>
        <div className="text-ink-dim text-[13px]">Insufficient data — no score computed</div>
      </div>
    );
  }

  const b = band(score);
  return (
    <div className="card p-3.5 space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] text-ink-muted uppercase tracking-wide">Source Quality Score</div>
        <span className={`text-[11px] font-medium ${b.text}`}>{b.label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[28px] font-bold ${b.text} leading-none`}>{score}</span>
        <span className="text-ink-dim text-sm">/100</span>
      </div>
      <div className="w-full bg-section h-1.5 rounded-sm overflow-hidden relative">
        <div
          className={`h-full ${b.bar} score-bar-fill rounded-sm`}
          style={{ "--target-width": `${score}%` } as React.CSSProperties}
        />
      </div>
      <p className="text-[11px] text-ink-dim leading-relaxed">
        Median credibility of outlets covering this topic — not a verdict on the claim.
      </p>
    </div>
  );
}
