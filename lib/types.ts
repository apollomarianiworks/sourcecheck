export type CheckMode = "claim" | "url" | "domain";

export type ScanDepth = "quick" | "deep";

export type EvidenceSource = "Fact Check" | "GDELT" | "Wikipedia" | "Domain DB";

export type EvidenceType = "supports" | "disputes" | "related" | "unclear";

export interface EvidenceItem {
  source: EvidenceSource;
  evidenceType: EvidenceType;
  title: string;
  publisher: string;
  url: string;
  snippet: string;
  domain: string;
  domainScore: number | null;
  domainLabel: string | null;
  domainTier: string | null;
  date: string | null;
  relevance: "high" | "medium" | "low";
  rating: string | null;
}

export interface DomainAnalysis {
  domain: string;
  score: number;
  tier: string;
  label: string;
  notes: string;
  tldBonus: number;
  tldNotes: string;
  finalScore: number;
  category: import("./categories").SourceCategory;
  categoryInferred: boolean;
  warningFlags: string[];
  preferredUse: string;
}

export interface DomainIntel {
  category: import("./categories").SourceCategory;
  categoryInferred: boolean;
  spoofingSignals: string[];
  spoofedBrand: string | null;
  pathSignals: string[];
}

export interface PageIntel {
  fetched: boolean;
  fetchError: string | null;
  finalUrl: string | null;
  httpStatus: number | null;
  title: string | null;
  description: string | null;
  byline: string | null;
  bylineSource: "meta" | "json-ld" | "selector" | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  ageDays: number | null;
  freshnessLabel: string;
  freshnessTone: "good" | "neutral" | "warn";
  outboundLinks: number;
  outboundDomains: string[];
  internalLinks: number;
  hasJsonLd: boolean;
  hasOpenGraph: boolean;
  hasAboutLink: boolean;
  hasContactLink: boolean;
  hasCorrectionsLink: boolean;
  wordCount: number;
  clickbaitScore: number | null;
  clickbaitLevel: "low" | "medium" | "high" | null;
  clickbaitSignals: string[];
}

export interface TransparencyIntel {
  score: number;
  level: "low" | "medium" | "high";
  factors: { label: string; delta: number; detail: string }[];
}

export interface ScoreFactor {
  label: string;
  delta: number;
  detail?: string;
}

export type ApiState = "ok" | "no-key" | "error" | "rate-limited";

export interface SearchVariantUsed {
  label: string;
  query: string;
  resultCount: number;
}

export interface ClaimLabel {
  id: string;
  text: string;
  tone: "good" | "warn" | "bad" | "neutral";
  detail?: string;
}

export interface EvidenceClusterPayload {
  id: string;
  kind: "publisher" | "stance" | "story";
  label: string;
  count: number;
  topItemIndex: number;
  itemIndexes: number[];
}

export interface DeepReport {
  claimBreakdown: {
    parts: { label: string; value: string }[];
    entities: string[];
    numbers: string[];
    dates: string[];
    quantifiers: string[];
    hasNegation: boolean;
    hasHedging: boolean;
  };
  timeline: {
    granularity: "year" | "month" | "week";
    earliestDate: string | null;
    latestDate: string | null;
    totalDatedItems: number;
    buckets: { period: string; count: number; earliest: string; latest: string; topTitles: string[] }[];
  };
  corroborating: number[];   // indexes into evidence[]
  conflicting: number[];     // indexes into evidence[]
  researchSummary: {
    headline: string;
    body: string;
    strongest: string[];
    weakest: string[];
    reliabilityNotes: string[];
    limitations: string[];
  };
}

export interface CheckResult {
  mode: CheckMode;
  depth: ScanDepth;
  input: string;
  normalizedInput: string;
  sourceQualityScore: number | null;
  scoreFactors: ScoreFactor[];
  evidenceVerdict: "supports" | "disputes" | "mixed" | "related-only" | "none";
  evidence: EvidenceItem[];
  clusters: EvidenceClusterPayload[];
  claimLabels: ClaimLabel[];
  missingSignals: { id: string; text: string }[];
  searchVariants: SearchVariantUsed[];
  safetyWarnings: { id: string; text: string; tone: "warn" | "bad" | "neutral" }[];
  confidence: {
    level: "high" | "medium" | "low" | "insufficient";
    score: number;
    rationale: string;
    factors: { label: string; delta: number; detail: string }[];
  };
  suggestions: { id: string; text: string; priority: "high" | "medium" | "low" }[];
  domainAnalysis: DomainAnalysis | null;
  domainIntel: DomainIntel | null;
  pageIntel: PageIntel | null;
  transparency: TransparencyIntel | null;
  summary: string;
  deepReport: DeepReport | null;
  noEvidence: boolean;
  checkedAt: string;
  warnings: string[];
  apiStatus: {
    factcheck: ApiState;
    gdelt: ApiState;
    wikipedia: ApiState;
  };
  sourceCoverage: SourceCoverageEntry[];
  coverageLevel: "low" | "medium" | "high";
  claimCategory: import("./sources/types").ClaimCategory;
}

export interface SourceCoverageEntry {
  adapter: string;
  name: string;
  status: "ok" | "no-key" | "rate-limited" | "error" | "blocked" | "skipped" | "not-applicable";
  itemCount: number;
  errorMessage?: string;
  durationMs?: number;
  requiresKey: boolean;
}

export interface HistoryEntry {
  id: string;
  mode: CheckMode;
  depth: ScanDepth;
  input: string;
  score: number | null;
  verdict: CheckResult["evidenceVerdict"];
  evidenceCount: number;
  checkedAt: string;
}

export interface CheckRequest {
  mode: CheckMode;
  input: string;
  depth?: ScanDepth;
}
