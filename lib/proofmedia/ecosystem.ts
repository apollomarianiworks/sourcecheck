import type {
  CreatorShowcase,
  DigestTemplate,
  DiscoverySuggestion,
  IntelligenceSpace,
  InvestigationBoard,
  SourceProfile,
  WorkspaceGroup,
} from "./types";

const stamp = "2026-05-16T00:00:00.000Z";

export const INTELLIGENCE_SPACES: IntelligenceSpace[] = [
  {
    id: "ai-tech",
    name: "AI & Tech",
    category: "ai-tech",
    description: "AI policy, model safety, platform power, open-source tooling, and technology claims.",
    starterPrompt: "Track claims about AI regulation, model capability, deepfakes, and platform manipulation.",
    pinnedResources: ["NIST AI RMF", "EU AI Act summaries", "FTC AI consumer guidance"],
    suggestedRoutines: ["Weekly AI regulation watch", "Deepfake claim monitor"],
    moderationModel: "local-starter",
    defaultTags: ["ai", "technology", "deepfakes", "policy"],
  },
  {
    id: "us-politics",
    name: "US Politics",
    category: "politics",
    description: "Election claims, policy debates, public statements, agencies, and legislative context.",
    starterPrompt: "Compare primary documents, credible reporting, and opposing policy arguments.",
    pinnedResources: ["Congress.gov", "FEC data", "official agency releases"],
    suggestedRoutines: ["Election claims monitor", "Policy source digest"],
    moderationModel: "local-starter",
    defaultTags: ["politics", "elections", "policy", "law"],
  },
  {
    id: "criminal-justice",
    name: "Criminal Justice",
    category: "justice",
    description: "Court cases, policing, public safety claims, legal records, and timeline context.",
    starterPrompt: "Separate court documents and official statements from commentary and reposts.",
    pinnedResources: ["CourtListener", "state court portals", "local government releases"],
    suggestedRoutines: ["Court docket watch", "Local claim timeline builder"],
    moderationModel: "local-starter",
    defaultTags: ["crime", "courts", "law", "local-news"],
  },
  {
    id: "health-medicine",
    name: "Health & Medicine",
    category: "health",
    description: "Medical claims, studies, public health updates, FDA/CDC/NIH context, and risk communication.",
    starterPrompt: "Look for primary research, official guidance, and uncertainty before amplifying health claims.",
    pinnedResources: ["PubMed", "CDC", "FDA", "NIH"],
    suggestedRoutines: ["Public health update digest", "Study quality monitor"],
    moderationModel: "local-starter",
    defaultTags: ["health", "medicine", "science", "studies"],
  },
  {
    id: "media-manipulation",
    name: "Media Manipulation",
    category: "media",
    description: "Viral narratives, social screenshots, edited clips, repost chains, and source laundering.",
    starterPrompt: "Trace earliest source, platform metadata, and whether a claim has independent corroboration.",
    pinnedResources: ["SourceMesh social check", "reverse search checklist", "fact-check archives"],
    suggestedRoutines: ["Viral claim watch", "Screenshot evidence audit"],
    moderationModel: "local-starter",
    defaultTags: ["viral", "media", "social", "misinformation"],
  },
  {
    id: "financial-scams",
    name: "Financial Scams",
    category: "finance",
    description: "SEC/FTC alerts, crypto schemes, influencer finance claims, corporate filings, and consumer warnings.",
    starterPrompt: "Search SEC, FTC, filings, consumer alerts, and independent reporting before sharing warnings.",
    pinnedResources: ["SEC releases", "FTC consumer alerts", "company filings"],
    suggestedRoutines: ["Crypto enforcement digest", "Scam alert monitor"],
    moderationModel: "local-starter",
    defaultTags: ["finance", "scams", "sec", "ftc"],
  },
];

export const CREATOR_SHOWCASE_TEMPLATE: CreatorShowcase = {
  mode: "researcher",
  statusLine: "Building source-backed collections and debate packets.",
  expertise: ["source finding", "timeline context", "debate preparation"],
  pinnedStatements: [
    "I care about primary sources first.",
    "I separate evidence from interpretation.",
  ],
  featuredCollectionIds: [],
  featuredDebateIds: [],
  featuredInvestigationIds: [],
  featuredEvidenceUrls: [],
  stats: {
    collectionSaves: 0,
    evidenceCitations: 0,
    contextNotesAccepted: 0,
    helpfulContributions: 0,
    debateParticipation: 0,
    researchFollowers: 0,
  },
};

export const INVESTIGATION_TEMPLATES: InvestigationBoard[] = [
  {
    id: "viral-claim-timeline",
    title: "Viral claim timeline",
    description: "Track where a claim appeared, what evidence exists, what is missing, and which sources conflict.",
    tags: ["viral", "timeline", "source-map"],
    clusters: [
      { id: "primary", label: "Primary evidence", evidenceUrls: [] },
      { id: "reporting", label: "Reporting and analysis", evidenceUrls: [] },
      { id: "social", label: "Social posts and reposts", evidenceUrls: [] },
    ],
    timeline: [],
    unresolvedQuestions: ["What is the earliest source?", "Is there a primary document?", "What would change confidence?"],
    conflictingEvidence: [],
    sourceMapDomains: [],
    owner: { authorUsername: "you", authorDisplayName: "You", createdAt: stamp, updatedAt: stamp },
  },
  {
    id: "policy-controversy-board",
    title: "Policy controversy evidence board",
    description: "Compare policy arguments, expert sources, statistics, tradeoffs, and opposing viewpoints.",
    tags: ["policy", "debate", "evidence-board"],
    clusters: [
      { id: "pro", label: "Evidence for", evidenceUrls: [] },
      { id: "con", label: "Evidence against", evidenceUrls: [] },
      { id: "unknowns", label: "Unresolved evidence", evidenceUrls: [] },
    ],
    timeline: [],
    unresolvedQuestions: ["Which statistics are contested?", "Which sources disagree?", "What assumptions drive each side?"],
    conflictingEvidence: [],
    sourceMapDomains: [],
    owner: { authorUsername: "you", authorDisplayName: "You", createdAt: stamp, updatedAt: stamp },
  },
];

export const DISCOVERY_SUGGESTIONS: DiscoverySuggestion[] = [
  {
    id: "opposing-viewpoint",
    reason: "opposing-viewpoint",
    title: "Find evidence from the other side",
    body: "Add at least one credible source that challenges your current framing before publishing.",
    href: "/explorer",
  },
  {
    id: "source-alternative",
    reason: "source-alternative",
    title: "Try a primary-source alternative",
    body: "Search official records, public datasets, court filings, papers, or agency releases.",
    href: "/data-sources",
  },
  {
    id: "under-discussed",
    reason: "under-discussed",
    title: "Look for under-discussed evidence",
    body: "Ask what important context is absent from popular narratives.",
    href: "/community",
  },
];

export const SOURCE_PROFILE_EXAMPLES: SourceProfile[] = [
  {
    domain: "cdc.gov",
    displayName: "CDC",
    category: "government",
    transparencyIndicators: ["official public health agency", "primary guidance", "dated releases"],
    citationBehavior: ["best for official guidance", "not a substitute for individualized medical advice"],
    usageStats: { citations: 0, collections: 0, debates: 0, investigations: 0 },
    relationshipDomains: ["nih.gov", "fda.gov", "pubmed.ncbi.nlm.nih.gov"],
  },
  {
    domain: "courtlistener.com",
    displayName: "CourtListener",
    category: "court-legal",
    transparencyIndicators: ["public legal archive", "links to opinions and dockets", "primary-adjacent records"],
    citationBehavior: ["useful for legal/court verification", "check jurisdiction and filing date"],
    usageStats: { citations: 0, collections: 0, debates: 0, investigations: 0 },
    relationshipDomains: ["supreme.justia.com", "uscourts.gov"],
  },
];

export const DIGEST_TEMPLATES: DigestTemplate[] = [
  { id: "daily-brief", name: "Daily Brief", cadence: "daily", includes: ["new-evidence", "context-notes", "routine-results"], delivery: "in-app-ready" },
  { id: "weekly-debate", name: "Weekly Debate Digest", cadence: "weekly", includes: ["debates", "new-evidence", "research-trends"], delivery: "export-only" },
  { id: "topic-watch", name: "Topic Watch Summary", cadence: "manual", includes: ["new-evidence", "routine-results", "research-trends"], delivery: "in-app-ready" },
  { id: "collection-update", name: "Collection Update Digest", cadence: "manual", includes: ["new-evidence", "context-notes"], delivery: "export-only" },
];

export const TEAM_FOUNDATION_EXAMPLES: WorkspaceGroup[] = [
  {
    id: "debate-club-template",
    name: "Debate Club Workspace",
    purpose: "debate-club",
    memberRoles: ["owner", "admin", "editor", "researcher", "viewer"],
    createdAt: stamp,
  },
  {
    id: "journalism-template",
    name: "Investigation Team Workspace",
    purpose: "journalism-team",
    memberRoles: ["owner", "editor", "researcher", "viewer"],
    createdAt: stamp,
  },
];

export function findSpace(spaceId: string) {
  return INTELLIGENCE_SPACES.find((space) => space.id === spaceId) ?? null;
}

export function findSourceProfile(domain: string) {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  return SOURCE_PROFILE_EXAMPLES.find((source) => source.domain === normalized) ?? {
    domain: normalized,
    displayName: normalized,
    category: null,
    transparencyIndicators: ["No local usage history yet", "Source profile scaffold only"],
    citationBehavior: ["Run SourceMesh checks and save evidence to build usage stats later"],
    usageStats: { citations: 0, collections: 0, debates: 0, investigations: 0 },
    relationshipDomains: [],
  } satisfies SourceProfile;
}
