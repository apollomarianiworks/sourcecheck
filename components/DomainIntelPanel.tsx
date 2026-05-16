"use client";

import type { DomainIntel, TransparencyIntel, DomainAnalysis } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";
import { describeFlag } from "@/lib/source-rules";

interface Props {
  intel: DomainIntel;
  transparency: TransparencyIntel | null;
  analysis: DomainAnalysis | null;
}

function transparencyColor(level: "low" | "medium" | "high"): string {
  return level === "high" ? "text-phosphor-green glow-green" :
         level === "medium" ? "text-phosphor-amber glow-amber" :
                              "text-phosphor-red glow-red";
}

function transparencyBar(level: "low" | "medium" | "high"): string {
  return level === "high" ? "bg-phosphor-green" :
         level === "medium" ? "bg-phosphor-amber" :
                              "bg-phosphor-red";
}

export default function DomainIntelPanel({ intel, transparency, analysis }: Props) {
  const tierColor =
    analysis?.tier === "A" ? "text-phosphor-green glow-green" :
    analysis?.tier === "B" ? "text-phosphor-cyan glow-cyan" :
    analysis?.tier === "C" ? "text-phosphor-amber glow-amber" :
    analysis?.tier === "?" ? "text-green-700" :
    "text-phosphor-red glow-red";

  const hasSignals =
    intel.spoofingSignals.length > 0 || intel.pathSignals.length > 0;

  return (
    <div className="crt-border p-4 space-y-4">
      <div className="text-xs text-green-700 tracking-widest">DOMAIN INTELLIGENCE</div>

      {/* Top row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-phosphor-green text-lg break-all">{analysis?.domain ?? "—"}</span>
          {analysis?.tier && (
            <span className={`text-2xl font-bold ${tierColor}`} style={{ fontFamily: "'VT323', monospace" }}>
              TIER {analysis.tier}
            </span>
          )}
          <CategoryBadge category={intel.category} inferred={intel.categoryInferred} />
        </div>
      </div>

      {/* Reputation note */}
      {analysis?.notes && (
        <div className="text-sm text-green-600 leading-relaxed">
          {analysis.notes}
        </div>
      )}

      {/* Preferred use — when the source database has a recommendation */}
      {analysis?.preferredUse && (
        <div className="border-l-2 border-cyan-800 pl-3 py-1 bg-cyan-950/10">
          <div className="text-[10px] tracking-widest text-phosphor-cyan">PREFERRED USE</div>
          <div className="text-xs text-green-500 mt-0.5">{analysis.preferredUse}</div>
        </div>
      )}

      {/* Warning flags from the source DB */}
      {analysis && analysis.warningFlags.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] tracking-widest text-green-700">SOURCE FLAGS</div>
          <div className="flex flex-wrap gap-1">
            {analysis.warningFlags.map((f) => {
              const meta = describeFlag(f);
              const toneCls =
                meta.tone === "good"    ? "border-green-700 text-phosphor-green" :
                meta.tone === "bad"     ? "border-red-700   text-phosphor-red" :
                meta.tone === "warn"    ? "border-amber-700 text-phosphor-amber" :
                                          "border-cyan-800  text-phosphor-cyan";
              return (
                <span
                  key={f}
                  className={`text-[10px] border px-1.5 py-0.5 tracking-wider ${toneCls}`}
                  title={f}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier / TLD info */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-green-800">
        {analysis && (
          <span>REPUTATION: <span className="text-phosphor-green">{analysis.finalScore}/100</span></span>
        )}
        {analysis && analysis.tldBonus !== 0 && (
          <span>TLD: {analysis.tldBonus > 0 ? "+" : ""}{analysis.tldBonus} <span className="text-green-900">({analysis.tldNotes})</span></span>
        )}
      </div>

      {/* Spoofing alerts */}
      {intel.spoofingSignals.length > 0 && (
        <div className="border border-red-800 p-3 space-y-1">
          <div className="text-xs tracking-widest text-phosphor-red glow-red">
            ⚠ SPOOFING SIGNALS DETECTED
          </div>
          <ul className="text-xs text-red-300 space-y-0.5">
            {intel.spoofingSignals.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
          {intel.spoofedBrand && (
            <div className="text-xs text-red-300 pt-1">
              <span className="text-red-500">Closest known brand:</span> {intel.spoofedBrand}
            </div>
          )}
        </div>
      )}

      {/* Path warnings */}
      {intel.pathSignals.length > 0 && (
        <div className="border border-amber-800 p-3 space-y-1">
          <div className="text-xs tracking-widest text-phosphor-amber glow-amber">
            ⚠ URL PATH WARNINGS
          </div>
          <ul className="text-xs text-amber-300 space-y-0.5">
            {intel.pathSignals.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasSignals && (
        <div className="text-xs text-green-700">
          ✓ No spoofing or suspicious path patterns detected.
        </div>
      )}

      {/* Transparency score */}
      {transparency && (
        <div className="border-t border-green-900/50 pt-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-green-700 tracking-widest">
              SOURCE TRANSPARENCY
            </span>
            <span className={`text-xl ${transparencyColor(transparency.level)}`}
                  style={{ fontFamily: "'VT323', monospace" }}>
              {transparency.score}/100 · {transparency.level.toUpperCase()}
            </span>
          </div>

          <div className="w-full bg-green-950 h-1.5 overflow-hidden">
            <div
              className={`h-full ${transparencyBar(transparency.level)} score-bar-fill`}
              style={{ "--target-width": `${transparency.score}%` } as React.CSSProperties}
            />
          </div>

          {transparency.factors.length > 0 && (
            <ul className="text-[11px] text-green-700 space-y-1 pt-1">
              {transparency.factors.map((f, i) => {
                const sign = f.delta > 0 ? "+" : "";
                const color =
                  f.delta > 0 ? "text-phosphor-green" :
                  f.delta < 0 ? "text-phosphor-red" :
                                "text-green-700";
                return (
                  <li key={i} className="flex gap-2">
                    <span className={`${color} font-mono shrink-0 w-10 text-right`}>
                      {f.delta === 0 ? "·" : `${sign}${f.delta}`}
                    </span>
                    <span className="flex-1">
                      <span className="text-green-500">{f.label}</span>
                      <span className="text-green-800"> — {f.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
