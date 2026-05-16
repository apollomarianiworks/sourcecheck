"use client";

import type { PageIntel } from "@/lib/types";

interface Props {
  page: PageIntel;
}

function checkmark(ok: boolean): string {
  return ok ? "✓" : "✗";
}

function checkColor(ok: boolean): string {
  return ok ? "text-phosphor-green" : "text-phosphor-red";
}

function freshnessColor(tone: "good" | "neutral" | "warn"): string {
  return tone === "good"    ? "text-phosphor-green" :
         tone === "neutral" ? "text-phosphor-cyan"  :
                              "text-phosphor-amber";
}

function clickbaitColor(level: "low" | "medium" | "high" | null): string {
  return level === "high"   ? "text-phosphor-red    glow-red" :
         level === "medium" ? "text-phosphor-amber  glow-amber" :
                              "text-phosphor-green";
}

export default function PageAnalysisPanel({ page }: Props) {
  if (!page.fetched) {
    return (
      <div className="crt-border-amber p-4 space-y-2">
        <div className="text-xs text-phosphor-amber glow-amber tracking-widest">
          CITATION QUALITY SCAN
        </div>
        <div className="text-xs text-amber-700 leading-relaxed">
          Could not fetch the page itself. {page.fetchError ?? "Unknown error."}
        </div>
        <div className="text-[10px] text-amber-800">
          Reason this can happen honestly: paywall, login required, server blocked the request,
          or the URL returned non-HTML content. Domain-level signals are still shown above.
        </div>
      </div>
    );
  }

  return (
    <div className="crt-border p-4 space-y-4">
      <div className="text-xs text-green-700 tracking-widest">CITATION QUALITY SCAN</div>

      {/* Article metadata */}
      <div className="space-y-2">
        {page.title && (
          <div className="text-sm text-phosphor-green leading-tight">{page.title}</div>
        )}
        {page.description && (
          <div className="text-xs text-green-700 leading-relaxed">{page.description}</div>
        )}
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <CheckRow
          ok={!!page.byline}
          label="Author / byline"
          value={page.byline ?? "Not detected"}
          subValue={page.bylineSource ? `via ${page.bylineSource}` : undefined}
        />
        <CheckRow
          ok={!!page.publishedAt}
          label="Publication date"
          value={page.publishedAt ? page.publishedAt.slice(0, 10) : "Not detected"}
          subValue={page.publishedAt ? `${page.freshnessLabel}` : undefined}
          subColor={freshnessColor(page.freshnessTone)}
        />
        <CheckRow
          ok={page.outboundLinks >= 3}
          label="Outbound source links"
          value={`${page.outboundLinks} link(s) · ${page.outboundDomains.length} domain(s)`}
          subValue={page.outboundDomains.slice(0, 3).join(", ") || undefined}
        />
        <CheckRow
          ok={page.hasJsonLd || page.hasOpenGraph}
          label="Structured metadata"
          value={[
            page.hasJsonLd ? "JSON-LD" : null,
            page.hasOpenGraph ? "OpenGraph" : null,
          ].filter(Boolean).join(", ") || "None"}
        />
        <CheckRow
          ok={page.hasAboutLink || page.hasContactLink}
          label="About / Contact link"
          value={[
            page.hasAboutLink   ? "About"   : null,
            page.hasContactLink ? "Contact" : null,
          ].filter(Boolean).join(", ") || "Not found"}
        />
        <CheckRow
          ok={page.hasCorrectionsLink}
          label="Corrections / standards"
          value={page.hasCorrectionsLink ? "Linked" : "Not found"}
        />
      </div>

      {/* Modified */}
      {page.modifiedAt && page.modifiedAt !== page.publishedAt && (
        <div className="text-[11px] text-green-800">
          Last modified: <span className="text-green-600">{page.modifiedAt.slice(0, 10)}</span>
        </div>
      )}

      {/* Word count */}
      {page.wordCount > 0 && (
        <div className="text-[11px] text-green-800">
          Article length: <span className="text-green-600">~{page.wordCount.toLocaleString()} words</span>
        </div>
      )}

      {/* Clickbait analysis */}
      {page.clickbaitScore !== null && (
        <div className="border-t border-green-900/40 pt-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-green-700 tracking-widest">CLICKBAIT / SENSATIONALISM</span>
            <span className={`text-sm tracking-wider ${clickbaitColor(page.clickbaitLevel)}`}>
              {page.clickbaitLevel?.toUpperCase()} · {page.clickbaitScore}/100
            </span>
          </div>

          <div className="w-full bg-green-950 h-1 overflow-hidden">
            <div
              className={`h-full score-bar-fill ${
                page.clickbaitLevel === "high"   ? "bg-phosphor-red" :
                page.clickbaitLevel === "medium" ? "bg-phosphor-amber" :
                                                   "bg-phosphor-green"
              }`}
              style={{ "--target-width": `${page.clickbaitScore}%` } as React.CSSProperties}
            />
          </div>

          {page.clickbaitSignals.length > 0 ? (
            <ul className="text-[11px] text-amber-700 space-y-0.5 pt-1">
              {page.clickbaitSignals.map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-green-700">
              ✓ No clickbait or manipulative-language patterns detected in the title.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckRow({
  ok,
  label,
  value,
  subValue,
  subColor,
}: {
  ok: boolean;
  label: string;
  value: string;
  subValue?: string;
  subColor?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`${checkColor(ok)} shrink-0 mt-0.5 font-mono`}>{checkmark(ok)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-green-500 tracking-wider text-[11px]">{label.toUpperCase()}</div>
        <div className="text-green-700 break-words">{value}</div>
        {subValue && (
          <div className={`text-[10px] ${subColor ?? "text-green-800"}`}>{subValue}</div>
        )}
      </div>
    </div>
  );
}
