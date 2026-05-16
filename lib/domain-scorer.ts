import type { DomainAnalysis } from "./types";
import { inferCategory, type SourceCategory } from "./categories";
import { lookupSource, lookupTld } from "./source-rules";

export function extractDomain(input: string): string {
  try {
    const withProtocol = input.startsWith("http") ? input : `https://${input}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^www\./, "").split("/")[0].trim().toLowerCase();
  }
}

export function scoreDomain(domain: string): DomainAnalysis | null {
  const clean = domain.replace(/^www\./, "").toLowerCase();

  const rule = lookupSource(clean);
  const tldHit = lookupTld(clean);
  const tldBonus = tldHit?.rule.bonus ?? 0;
  const tldNotes = tldHit?.rule.notes ?? "Unknown TLD";

  if (!rule) {
    // Unknown — fall back to TLD-inferred category and a neutral baseline
    const unknownBase = 45;
    const inferred: SourceCategory = tldHit?.rule.category ?? inferCategory(clean);
    return {
      domain: clean,
      score: unknownBase,
      tier: "?",
      label: "Unknown Domain",
      notes: "No reputation rule on file. Score derives from TLD and inference only.",
      tldBonus,
      tldNotes,
      finalScore: Math.min(100, Math.max(0, unknownBase + tldBonus)),
      category: inferred,
      categoryInferred: true,
      warningFlags: [],
      preferredUse: "",
    };
  }

  const finalScore = Math.min(100, Math.max(0, rule.baseQualityScore + tldBonus));
  return {
    domain: clean,
    score: rule.baseQualityScore,
    tier: tierFromScore(rule.baseQualityScore, rule.category),
    label: humanLabel(rule.category, rule.notes),
    notes: rule.notes,
    tldBonus,
    tldNotes,
    finalScore,
    category: rule.category,
    categoryInferred: false,
    warningFlags: rule.warningFlags,
    preferredUse: rule.preferredUse,
  };
}

function tierFromScore(score: number, category: SourceCategory): string {
  if (category === "satire") return "SAT";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function humanLabel(category: SourceCategory, notes: string): string {
  // Derive a short human-readable label from the category + notes
  switch (category) {
    case "government":       return "Government / Official";
    case "court-legal":      return "Court / Legal";
    case "academic":         return "Academic / Research";
    case "medical-science":  return "Medical / Scientific";
    case "mainstream-news":  return notes.includes("wire") ? "Major Wire Service" : "Established News";
    case "local-news":       return "Local News";
    case "fact-checker":     return "Dedicated Fact-Checker";
    case "encyclopedia":     return "Encyclopedia";
    case "advocacy":         return "Advocacy / Ideological";
    case "tabloid":          return "Tabloid";
    case "conspiracy":       return "Conspiracy / Misinformation";
    case "satire":           return "Satire";
    case "blog":             return "Blog / User Publishing";
    case "social-media":     return "Social Media";
    case "unknown":          return "Unknown";
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "A": return "green";
    case "B": return "cyan";
    case "C": return "amber";
    case "D": return "red";
    case "F": return "red";
    case "SAT": return "amber";
    default: return "amber";
  }
}
