"use client";

import type { CheckResult, EvidenceItem } from "@/lib/types";
import { strongestSources, weakestSignals } from "@/lib/scoring";

interface Props {
  result: CheckResult;
}

export default function AnalysisPanel({ result }: Props) {
  if (result.evidence.length === 0) return null;

  const strongest = strongestSources(result.evidence, 3);
  const weakest = weakestSignals(result.evidence, 3);
  const factCount = result.evidence.filter((e) => e.source === "Fact Check").length;
  const newsCount = result.evidence.filter((e) => e.source === "GDELT").length;
  const wikiCount = result.evidence.filter((e) => e.source === "Wikipedia").length;
  const dbCount   = result.evidence.filter((e) => e.source === "Domain DB").length;

  return (
    <div className="crt-border p-4 space-y-4">
      <div className="text-xs text-green-700 tracking-widest">SIGNAL ANALYSIS</div>

      {/* What we found */}
      <Section title="WHAT WE FOUND">
        <ul className="text-sm text-green-600 space-y-1">
          {factCount > 0 && <li>· {factCount} dedicated fact-check review{factCount !== 1 ? "s" : ""}</li>}
          {newsCount > 0 && <li>· {newsCount} news article{newsCount !== 1 ? "s" : ""} from GDELT</li>}
          {wikiCount > 0 && <li>· {wikiCount} encyclopedia entr{wikiCount !== 1 ? "ies" : "y"}</li>}
          {dbCount > 0   && <li>· {dbCount} domain database match{dbCount !== 1 ? "es" : ""}</li>}
          {factCount === 0 && newsCount === 0 && wikiCount === 0 && dbCount === 0 && (
            <li className="text-green-800">· No signals returned</li>
          )}
        </ul>
      </Section>

      {/* Strongest sources */}
      {strongest.length > 0 && (
        <Section title="STRONGEST SOURCES" color="green">
          <ul className="text-sm space-y-1">
            {strongest.map((e, i) => (
              <SignalRow key={i} item={e} color="green" />
            ))}
          </ul>
        </Section>
      )}

      {/* Weakest signals */}
      {weakest.length > 0 && weakest[0].domainScore !== null && weakest[0].domainScore < 70 && (
        <Section title="WEAKEST SIGNALS" color="amber">
          <ul className="text-sm space-y-1">
            {weakest
              .filter((e) => e.domainScore !== null && e.domainScore < 70)
              .map((e, i) => (
                <SignalRow key={i} item={e} color="amber" />
              ))}
          </ul>
        </Section>
      )}

      {/* Why the score */}
      {result.scoreFactors.length > 0 && result.sourceQualityScore !== null && (
        <Section title="WHY THIS SCORE">
          <ul className="text-xs space-y-1.5">
            {result.scoreFactors.map((f, i) => {
              const sign = f.delta >= 0 ? "+" : "";
              const color =
                f.delta > 0 ? "text-phosphor-green" :
                f.delta < 0 ? "text-phosphor-red" :
                              "text-green-600";
              return (
                <li key={i} className="flex gap-2">
                  <span className={`${color} w-12 shrink-0 font-mono`}>
                    {sign}{f.delta}
                  </span>
                  <span className="flex-1">
                    <div className="text-green-500">{f.label}</div>
                    {f.detail && <div className="text-green-800 text-[11px]">{f.detail}</div>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  color,
}: {
  title: string;
  children: React.ReactNode;
  color?: "green" | "amber";
}) {
  const titleColor =
    color === "amber" ? "text-phosphor-amber" : "text-green-500";
  return (
    <div>
      <div className={`text-xs tracking-widest mb-1 ${titleColor}`}>{title}</div>
      {children}
    </div>
  );
}

function SignalRow({ item, color }: { item: EvidenceItem; color: "green" | "amber" }) {
  const c = color === "amber" ? "text-phosphor-amber" : "text-phosphor-green";
  return (
    <li className="flex items-baseline gap-2">
      <span className={`${c} font-mono shrink-0 w-10 text-right`}>
        {item.domainScore ?? "—"}
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-green-500 truncate block">{item.domain}</span>
        <span className="text-green-800 text-[11px] block truncate">
          {item.domainLabel ?? "Unknown source"}
        </span>
      </span>
    </li>
  );
}
