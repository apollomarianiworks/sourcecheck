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
  sourceMesh?: SourceMeshReport;
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

export type SourceMeshInputType =
  | "normal-claim"
  | "vague-question"
  | "article-url"
  | "domain"
  | "social-url"
  | "screenshot-text"
  | "celebrity-person-claim"
  | "health-claim"
  | "crime-local-claim"
  | "political-claim"
  | "finance-scam-claim"
  | "ai-deepfake-claim"
  | "science-research-claim"
  | "legal-court-claim"
  | "opinion-not-fact-checkable";

export type SourceMeshConfidenceLabel =
  | "Strong evidence found"
  | "Moderate evidence found"
  | "Weak evidence found"
  | "Mixed evidence"
  | "No strong evidence found"
  | "Needs primary source"
  | "Too vague to verify"
  | "Opinion/not fact-checkable";

export interface SourceMeshUnderstanding {
  originalInput: string;
  cleanedInput: string;
  inputType: SourceMeshInputType;
  searchIntent: SourceMeshSearchIntent;
  recognizedAs: string;
  convertedClaim: string;
  entities: string[];
  categories: import("./sources/types").ClaimCategory[];
  hints: {
    dates: string[];
    locations: string[];
    people: string[];
    organizations: string[];
    sourceTargets: string[];
  };
  isVague: boolean;
  isOpinion: boolean;
}

export type SourceMeshSearchIntent =
  | "fact-check"
  | "debate-prep"
  | "definition"
  | "article-finder"
  | "source-check"
  | "social-check"
  | "compare"
  | "research-report"
  | "legal-medical-caution";

export interface SourceMeshSourceChecked {
  adapter: string;
  name: string;
  status: SourceCoverageEntry["status"];
  itemCount: number;
  requiresKey: boolean;
  optional: boolean;
  quality: "primary" | "high" | "medium" | "context" | "weak";
  notes: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface SourceMeshEvidenceMap {
  strongest: EvidenceItem[];
  weakest: EvidenceItem[];
  bySource: { source: string; count: number; quality: string }[];
  byStance: { stance: EvidenceType; count: number }[];
}

export interface SocialMetadata {
  platform: "youtube" | "tiktok" | "instagram" | "x-twitter" | "facebook" | "reddit" | "threads" | "unknown";
  url: string;
  canonicalUrl: string;
  username: string | null;
  postId: string | null;
  videoId: string | null;
  title: string | null;
  caption: string | null;
  likelyClaims: string[];
  authorName: string | null;
  authorUrl: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  providerName: string | null;
  fetched: boolean;
  fetchMethod: "oembed" | "public-json" | "html-metadata" | "none";
  limitations: string[];
  errorMessage: string | null;
}

export interface SocialScore {
  score: number;
  label: "strong" | "moderate" | "weak" | "unknown";
  factors: { label: string; delta: number; detail: string }[];
  warnings: string[];
}

export interface SourceMeshReport {
  pipeline: string[];
  understanding: SourceMeshUnderstanding;
  searchVariants: string[];
  searchPlan: {
    interpretedQuery: string;
    detectedCategory: string;
    searchIntent: SourceMeshSearchIntent;
    selectedAdapters: string[];
    selectedAdapterRationale: string[];
    skippedSources: string[];
    failedSources: string[];
    whyTheseSources: string[];
    topicMemory: string[];
  };
  sourcesChecked: SourceMeshSourceChecked[];
  evidenceMap: SourceMeshEvidenceMap;
  confidenceLabel: SourceMeshConfidenceLabel;
  uncertaintyLevel: "low" | "medium" | "high" | "very-high";
  evidenceFound: string[];
  missingEvidence: string[];
  suggestedSearches: string[];
  suggestedBetterInputs: string[];
  optionalIntegrations: { name: string; envVar: string; status: "available" | "missing"; notes: string }[];
  social?: {
    metadata: SocialMetadata;
    sourceQuality: SocialScore;
    claimEvidenceNote: string;
  } | null;
}
