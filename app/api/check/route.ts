import { NextRequest, NextResponse } from "next/server";
import { searchGdelt } from "@/lib/gdelt";
import { searchWikipedia } from "@/lib/wikimedia";
import { searchFactCheck } from "@/lib/factcheck";
import { scoreDomain } from "@/lib/domain-scorer";
import {
  normalizeClaim,
  normalizeUrl,
  normalizeDomain,
} from "@/lib/normalize";
import { computeScoreBreakdown, computeVerdict } from "@/lib/scoring";
import { validateInput } from "@/lib/validate";
import { detectSpoofing, analyzeUrlPath } from "@/lib/spoofing";
import { analyzePage } from "@/lib/page-analyzer";
import { computeTransparency, freshnessLabel } from "@/lib/transparency";
import { CATEGORY_META } from "@/lib/categories";
import { expandQuery } from "@/lib/query-expand";
import { clusterEvidence } from "@/lib/cluster";
import { computeClaimLabels } from "@/lib/claim-labels";
import { breakdownClaim } from "@/lib/claim-breakdown";
import { buildTimeline } from "@/lib/timeline";
import { buildResearchSummary } from "@/lib/research-summary";
import { analyzeClaimQuality, type ClaimQualityResult, type SafetyWarning } from "@/lib/claim-quality";
import { computeConfidence, buildSuggestions, deriveSafetyWarnings } from "@/lib/confidence";
import { rateLimit, ipFromRequest, pruneBuckets } from "@/lib/rate-limit";
import { guardApiAction, SecurityError } from "@/lib/security/guard";
import type { FactCheckResult } from "@/lib/factcheck";
import { multiSearch, detectCategory } from "@/lib/sources";
import { toEvidenceItem } from "@/lib/sources/types";
import type { ClaimCategory } from "@/lib/sources/types";
import type {
  CheckRequest, CheckResult, EvidenceItem, ApiState, ScanDepth, DeepReport,
  DomainIntel, PageIntel, TransparencyIntel, SearchVariantUsed, SourceCoverageEntry,
} from "@/lib/types";

function rejectedStatus(reason: unknown): ApiState {
  const r = reason as Error & { rateLimited?: boolean };
  return r?.rateLimited ? "rate-limited" : "error";
}

export const runtime = "nodejs";

type ApiStatus = CheckResult["apiStatus"];

export async function POST(req: NextRequest) {
  try {
    guardApiAction(req, "sourceMeshScan");
  } catch (error) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Something went wrong. Try again shortly." }, { status: 500 });
  }
  // ── Per-IP rate limiting (in-memory, 30 req/min) ──
  pruneBuckets();
  const ip = ipFromRequest(req);
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached. Try again in ${rl.retryAfterSeconds} second(s).`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetMs / 1000)),
        },
      }
    );
  }

  let body: CheckRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, input } = body;
  const depth: ScanDepth = body.depth === "deep" ? "deep" : "quick";

  if (!mode || !input || input.trim().length === 0) {
    return NextResponse.json(
      { error: "mode and input are required" },
      { status: 400 }
    );
  }

  const validation = validateInput(mode, input);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  try {
    if (mode === "claim") {
      return NextResponse.json(await handleClaim(input, depth));
    } else if (mode === "url") {
      return NextResponse.json(await handleUrl(input, depth));
    } else if (mode === "domain") {
      return NextResponse.json(await handleDomain(input, depth));
    } else {
      return NextResponse.json(
        { error: "mode must be claim, url, or domain" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[/api/check] error:", err);
    return NextResponse.json(
      { error: "Upstream API error. Try again shortly." },
      { status: 502 }
    );
  }
}

async function handleClaim(rawClaim: string, depth: ScanDepth): Promise<CheckResult> {
  const warnings: string[] = [];
  const normalized = normalizeClaim(rawClaim);

  // ── 1) Generate search variants ──
  const variants = expandQuery(normalized);
  if (variants.length === 0) {
    variants.push({ label: "original", query: normalized.slice(0, 280) });
  }

  // ── 2) Fan out — deeper scan = more variants per adapter ──
  const fcVariants    = depth === "deep" ? variants.slice(0, 5) : variants.slice(0, 3);
  const gdeltVariants = depth === "deep" ? variants.slice(0, 4) : variants.slice(0, 2);
  const wikiVariants  = depth === "deep"
    ? variants.slice(0, 2)
    : [variants.find((v) => v.label === "keywords") ?? variants[0]];

  const fcSettled    = await Promise.allSettled(fcVariants.map((v)    => searchFactCheck(v.query)));
  const gdeltSettled = await Promise.allSettled(gdeltVariants.map((v) => searchGdelt(v.query)));
  const wikiSettled  = await Promise.allSettled(wikiVariants.map((v)  => searchWikipedia(v.query)));

  const apiStatus: ApiStatus = { factcheck: "no-key", gdelt: "error", wikipedia: "error" };
  const allEvidence: EvidenceItem[] = [];
  const variantsUsed: SearchVariantUsed[] = [];

  // Fact Check — collapse to the best status across attempts
  let fcAnyOk = false, fcAnyKey = false, fcAnyRate = false, fcAnyError: string | null = null;
  for (let i = 0; i < fcVariants.length; i++) {
    const v = fcVariants[i];
    const res = fcSettled[i];
    if (res.status === "fulfilled") {
      const fc = res.value as FactCheckResult;
      variantsUsed.push({ label: `factcheck:${v.label}`, query: v.query, resultCount: fc.items.length });
      if (fc.status === "ok") { fcAnyOk = true; allEvidence.push(...fc.items); }
      else if (fc.status === "no-key") { fcAnyKey = true; }
      else if (fc.status === "rate-limited") { fcAnyRate = true; fcAnyError = fc.errorMessage ?? null; }
      else if (fc.errorMessage) { fcAnyError = fc.errorMessage; }
    } else {
      variantsUsed.push({ label: `factcheck:${v.label}`, query: v.query, resultCount: 0 });
      const r = rejectedStatus(res.reason);
      if (r === "rate-limited") fcAnyRate = true;
      fcAnyError = String(res.reason);
    }
  }
  if (fcAnyOk)          apiStatus.factcheck = "ok";
  else if (fcAnyRate)   apiStatus.factcheck = "rate-limited";
  else if (fcAnyKey)    apiStatus.factcheck = "no-key";
  else if (fcAnyError)  apiStatus.factcheck = "error";
  if (apiStatus.factcheck === "no-key") {
    warnings.push("FACTCHECK_API_KEY not set — skipping Google Fact Check Tools. See env.example.");
  } else if (apiStatus.factcheck === "rate-limited" || apiStatus.factcheck === "error") {
    if (fcAnyError) warnings.push(`Fact Check: ${fcAnyError}`);
  }

  // GDELT
  let gdeltAnyOk = false, gdeltAnyRate = false, gdeltLastErr: string | null = null;
  for (let i = 0; i < gdeltVariants.length; i++) {
    const v = gdeltVariants[i];
    const res = gdeltSettled[i];
    if (res.status === "fulfilled") {
      gdeltAnyOk = true;
      allEvidence.push(...res.value);
      variantsUsed.push({ label: `gdelt:${v.label}`, query: v.query, resultCount: res.value.length });
    } else {
      const r = rejectedStatus(res.reason);
      if (r === "rate-limited") gdeltAnyRate = true;
      gdeltLastErr = String(res.reason);
      variantsUsed.push({ label: `gdelt:${v.label}`, query: v.query, resultCount: 0 });
    }
  }
  apiStatus.gdelt = gdeltAnyOk ? "ok" : gdeltAnyRate ? "rate-limited" : "error";
  if (!gdeltAnyOk && gdeltLastErr) warnings.push(`GDELT: ${gdeltLastErr}`);

  // Wikipedia
  let wikiAnyOk = false, wikiLastErr: string | null = null;
  for (let i = 0; i < wikiVariants.length; i++) {
    const v = wikiVariants[i];
    const res = wikiSettled[i];
    if (res.status === "fulfilled") {
      wikiAnyOk = true;
      allEvidence.push(...res.value);
      variantsUsed.push({ label: `wiki:${v.label}`, query: v.query, resultCount: res.value.length });
    } else {
      const r = rejectedStatus(res.reason);
      if (r === "rate-limited") apiStatus.wikipedia = "rate-limited";
      wikiLastErr = String(res.reason);
      variantsUsed.push({ label: `wiki:${v.label}`, query: v.query, resultCount: 0 });
    }
  }
  if (wikiAnyOk) apiStatus.wikipedia = "ok";
  else if (wikiLastErr) warnings.push(`Wikipedia: ${wikiLastErr}`);

  // ── 2.5) PASS 11: registry — pull in the new free adapters in parallel ──
  const legacyCounts = {
    factcheck: allEvidence.filter((e) => e.source === "Fact Check").length,
    gdelt:     allEvidence.filter((e) => e.source === "GDELT").length,
    wikipedia: allEvidence.filter((e) => e.source === "Wikipedia").length,
  };
  let registry: RegistryEnrichment;
  try {
    registry = await runRegistry(normalized, apiStatus, legacyCounts);
    allEvidence.push(...registry.evidence);
  } catch (e) {
    // Never let registry failures break the response
    registry = {
      evidence: [],
      coverage: [
        { adapter: "googleFactCheck", name: "Google Fact Check Tools", status: apiStatus.factcheck, itemCount: legacyCounts.factcheck, requiresKey: true },
        { adapter: "gdelt", name: "GDELT 2.0", status: apiStatus.gdelt, itemCount: legacyCounts.gdelt, requiresKey: false },
        { adapter: "wikimedia", name: "Wikipedia", status: apiStatus.wikipedia, itemCount: legacyCounts.wikipedia, requiresKey: false },
      ],
      coverageLevel: "low",
      category: "general",
    };
    warnings.push(`Source registry failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3) Dedupe by URL, sort, then re-cluster against the final ordering ──
  const pass1 = clusterEvidence(allEvidence);
  const finalEvidence = pass1.dedupedEvidence.slice().sort(sortEvidence);
  const pass2 = clusterEvidence(finalEvidence);
  const finalClusters = pass2.clusters;

  // ── 4) Score & verdict ──
  const noEvidence = finalEvidence.length === 0;
  const breakdown = computeScoreBreakdown(finalEvidence);
  const evidenceVerdict = computeVerdict(finalEvidence);

  // ── 5) Claim-level labels ──
  const { labels, missing } = computeClaimLabels({
    claim: normalized,
    evidence: finalEvidence,
    verdict: evidenceVerdict,
  });

  const safety = buildSafetyPayload({
    input: rawClaim,
    mode: "claim",
    verdict: evidenceVerdict,
    evidence: finalEvidence,
    domainAnalysis: null,
    apiStatus,
  });

  const deepReport: DeepReport | null = depth === "deep"
    ? buildDeepReport({
        input: rawClaim,
        mode: "claim",
        verdict: evidenceVerdict,
        evidence: finalEvidence,
        sourceQualityScore: breakdown.score,
        claimLabels: labels,
        apiStatus,
      })
    : null;

  return {
    mode: "claim",
    depth,
    input: rawClaim,
    normalizedInput: normalized,
    sourceQualityScore: breakdown.score,
    scoreFactors: breakdown.factors,
    evidenceVerdict,
    evidence: finalEvidence,
    clusters: finalClusters,
    claimLabels: labels,
    missingSignals: missing,
    searchVariants: variantsUsed,
    safetyWarnings: safety.safetyWarnings,
    confidence: safety.confidence,
    suggestions: safety.suggestions,
    sourceCoverage: registry.coverage,
    coverageLevel: registry.coverageLevel,
    claimCategory: registry.category,
    domainAnalysis: null,
    domainIntel: null,
    pageIntel: null,
    transparency: null,
    summary: buildClaimSummary(finalEvidence, evidenceVerdict, apiStatus),
    deepReport,
    noEvidence,
    checkedAt: new Date().toISOString(),
    warnings,
    apiStatus,
  };
}

async function handleUrl(rawUrl: string, depth: ScanDepth): Promise<CheckResult> {
  const warnings: string[] = [];
  const { url, domain } = normalizeUrl(rawUrl);
  const domainAnalysis = scoreDomain(domain);

  const spoofing = detectSpoofing(domain);
  const pathSuspicion = analyzeUrlPath(url);

  const [fcResult, gdeltResult, wikiResult, pageResult] = await Promise.allSettled([
    searchFactCheck(domain),
    searchGdelt(domain),
    searchWikipedia(domain),
    analyzePage(url),
  ]);

  const apiStatus: ApiStatus = { factcheck: "no-key", gdelt: "error", wikipedia: "error" };
  const evidence: EvidenceItem[] = [];

  if (domainAnalysis && domainAnalysis.tier !== "?") {
    evidence.push({
      source: "Domain DB",
      evidenceType: domainAnalysis.score >= 60 ? "supports" : domainAnalysis.score >= 40 ? "unclear" : "disputes",
      title: `${domain} — ${domainAnalysis.label}`,
      publisher: "Proofbase Domain DB",
      url: `https://${domain}`,
      snippet: `${domainAnalysis.notes}${domainAnalysis.tldBonus !== 0 ? ` · TLD adjustment ${domainAnalysis.tldBonus > 0 ? "+" : ""}${domainAnalysis.tldBonus}.` : ""}`,
      domain,
      domainScore: domainAnalysis.finalScore,
      domainLabel: domainAnalysis.label,
      domainTier: domainAnalysis.tier,
      date: null,
      relevance: "high",
      rating: `Tier ${domainAnalysis.tier} · ${domainAnalysis.finalScore}/100`,
    });
  }

  if (fcResult.status === "fulfilled") {
    apiStatus.factcheck = fcResult.value.status;
    evidence.push(...fcResult.value.items);
    if (fcResult.value.status === "no-key") {
      warnings.push(
        "FACTCHECK_API_KEY not set — skipping Google Fact Check Tools."
      );
    } else if (fcResult.value.status === "rate-limited") {
      warnings.push(`Fact Check: ${fcResult.value.errorMessage}`);
    } else if (fcResult.value.status === "error" && fcResult.value.errorMessage) {
      warnings.push(`Fact Check: ${fcResult.value.errorMessage}`);
    }
  } else {
    apiStatus.factcheck = rejectedStatus(fcResult.reason);
  }

  if (gdeltResult.status === "fulfilled") {
    apiStatus.gdelt = "ok";
    evidence.push(...gdeltResult.value);
  } else {
    apiStatus.gdelt = rejectedStatus(gdeltResult.reason);
    warnings.push(`GDELT: ${String(gdeltResult.reason)}`);
  }

  if (wikiResult.status === "fulfilled") {
    apiStatus.wikipedia = "ok";
    evidence.push(...wikiResult.value);
  } else {
    apiStatus.wikipedia = rejectedStatus(wikiResult.reason);
    warnings.push(`Wikipedia: ${String(wikiResult.reason)}`);
  }

  // PASS 11: registry — for URL mode we search the page TITLE (if extracted)
  // so we can find independent coverage of the same story. Falls back to the
  // domain when we couldn't extract a title.
  const page = pageResult.status === "fulfilled" ? pageResult.value : null;
  const registryQuery = page?.title && page.title.length > 8 ? page.title : domain;
  const urlLegacyCounts = {
    factcheck: evidence.filter((e) => e.source === "Fact Check").length,
    gdelt:     evidence.filter((e) => e.source === "GDELT").length,
    wikipedia: evidence.filter((e) => e.source === "Wikipedia").length,
  };
  let registry: RegistryEnrichment;
  try {
    registry = await runRegistry(registryQuery, apiStatus, urlLegacyCounts);
    evidence.push(...registry.evidence);
  } catch (e) {
    registry = {
      evidence: [],
      coverage: [
        { adapter: "googleFactCheck", name: "Google Fact Check Tools", status: apiStatus.factcheck, itemCount: urlLegacyCounts.factcheck, requiresKey: true },
        { adapter: "gdelt", name: "GDELT 2.0", status: apiStatus.gdelt, itemCount: urlLegacyCounts.gdelt, requiresKey: false },
        { adapter: "wikimedia", name: "Wikipedia", status: apiStatus.wikipedia, itemCount: urlLegacyCounts.wikipedia, requiresKey: false },
      ],
      coverageLevel: "low",
      category: "general",
    };
    warnings.push(`Source registry failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // dedupe + cluster
  const urlPass = clusterEvidence(evidence);
  const urlEvidence = urlPass.dedupedEvidence.slice().sort(sortEvidence);
  const urlClusters = clusterEvidence(urlEvidence).clusters;

  const noEvidence = urlEvidence.length === 0;
  const breakdown = computeScoreBreakdown(urlEvidence);
  const evidenceVerdict = computeVerdict(urlEvidence);

  const { labels: urlLabels, missing: urlMissing } = computeClaimLabels({
    claim: rawUrl,
    evidence: urlEvidence,
    verdict: evidenceVerdict,
  });

  if (pageResult.status === "rejected") {
    warnings.push(`Page fetch: ${String(pageResult.reason)}`);
  } else if (page && page.fetchError) {
    warnings.push(`Page fetch: ${page.fetchError}`);
  }

  if (spoofing.isSpoof) {
    warnings.push(
      `Spoofing signals: ${spoofing.signals.join("; ")}${spoofing.matchedBrand ? ` — looks like ${spoofing.matchedBrand}` : ""}`
    );
  }
  if (pathSuspicion.suspicious) {
    warnings.push(`URL path: ${pathSuspicion.signals.join("; ")}`);
  }

  const pageIntel = page ? buildPageIntel(page) : null;
  const transparencyReport = computeTransparency(page, spoofing, pathSuspicion);
  const transparency: TransparencyIntel = {
    score: transparencyReport.score,
    level: transparencyReport.level,
    factors: transparencyReport.factors,
  };
  const domainIntel: DomainIntel = {
    category: domainAnalysis?.category ?? "unknown",
    categoryInferred: domainAnalysis?.categoryInferred ?? true,
    spoofingSignals: spoofing.signals,
    spoofedBrand: spoofing.matchedBrand,
    pathSignals: pathSuspicion.signals,
  };

  // Blend transparency into Source Quality Score for URLs:
  // 70% domain reputation, 30% transparency (when we fetched the page)
  let sourceQualityScore: number | null;
  if (domainAnalysis && page?.fetched) {
    sourceQualityScore = Math.round(domainAnalysis.finalScore * 0.7 + transparency.score * 0.3);
  } else {
    sourceQualityScore = domainAnalysis?.finalScore ?? breakdown.score;
  }

  const urlSafety = buildSafetyPayload({
    input: rawUrl,
    mode: "url",
    verdict: evidenceVerdict,
    evidence: urlEvidence,
    domainAnalysis,
    apiStatus,
  });

  const deepReport: DeepReport | null = depth === "deep"
    ? buildDeepReport({
        input: rawUrl,
        mode: "url",
        verdict: evidenceVerdict,
        evidence: urlEvidence,
        sourceQualityScore,
        claimLabels: urlLabels,
        apiStatus,
      })
    : null;

  return {
    mode: "url",
    depth,
    input: rawUrl,
    normalizedInput: url,
    sourceQualityScore,
    scoreFactors: breakdown.factors,
    evidenceVerdict,
    evidence: urlEvidence,
    clusters: urlClusters,
    claimLabels: urlLabels,
    missingSignals: urlMissing,
    searchVariants: [],
    safetyWarnings: urlSafety.safetyWarnings,
    confidence: urlSafety.confidence,
    suggestions: urlSafety.suggestions,
    sourceCoverage: registry.coverage,
    coverageLevel: registry.coverageLevel,
    claimCategory: registry.category,
    domainAnalysis,
    domainIntel,
    pageIntel,
    transparency,
    summary: buildUrlSummary(domain, domainAnalysis, urlEvidence, page),
    deepReport,
    noEvidence,
    checkedAt: new Date().toISOString(),
    warnings,
    apiStatus,
  };
}

function buildPageIntel(page: Awaited<ReturnType<typeof analyzePage>>): PageIntel {
  const fresh = freshnessLabel(page.ageDays);
  return {
    fetched: page.fetched,
    fetchError: page.fetchError,
    finalUrl: page.finalUrl,
    httpStatus: page.httpStatus,
    title: page.title,
    description: page.description,
    byline: page.byline,
    bylineSource: page.bylineSource,
    publishedAt: page.publishedAt,
    modifiedAt: page.modifiedAt,
    ageDays: page.ageDays,
    freshnessLabel: fresh.label,
    freshnessTone: fresh.tone,
    outboundLinks: page.outboundLinks,
    outboundDomains: page.outboundDomains,
    internalLinks: page.internalLinks,
    hasJsonLd: page.hasJsonLd,
    hasOpenGraph: page.hasOpenGraph,
    hasAboutLink: page.hasAboutLink,
    hasContactLink: page.hasContactLink,
    hasCorrectionsLink: page.hasCorrectionsLink,
    wordCount: page.wordCount,
    clickbaitScore: page.clickbait?.score ?? null,
    clickbaitLevel: page.clickbait?.level ?? null,
    clickbaitSignals: page.clickbait?.signals ?? [],
  };
}

async function handleDomain(rawDomain: string, depth: ScanDepth): Promise<CheckResult> {
  const warnings: string[] = [];
  const domain = normalizeDomain(rawDomain);
  const domainAnalysis = scoreDomain(domain);

  const spoofing = detectSpoofing(domain);
  // No URL path for plain domain mode
  const pathSuspicion = { suspicious: false, signals: [] };

  const [gdeltResult, wikiResult] = await Promise.allSettled([
    searchGdelt(domain),
    searchWikipedia(domain),
  ]);

  const apiStatus: ApiStatus = { factcheck: "no-key", gdelt: "error", wikipedia: "error" };
  const evidence: EvidenceItem[] = [];

  if (domainAnalysis && domainAnalysis.tier !== "?") {
    evidence.push({
      source: "Domain DB",
      evidenceType: domainAnalysis.score >= 60 ? "supports" : domainAnalysis.score >= 40 ? "unclear" : "disputes",
      title: `${domain} — ${domainAnalysis.label}`,
      publisher: "Proofbase Domain DB",
      url: `https://${domain}`,
      snippet: `${domainAnalysis.notes}${domainAnalysis.tldBonus !== 0 ? ` · TLD ${domainAnalysis.tldBonus > 0 ? "+" : ""}${domainAnalysis.tldBonus} (${domainAnalysis.tldNotes}).` : ""}`,
      domain,
      domainScore: domainAnalysis.finalScore,
      domainLabel: domainAnalysis.label,
      domainTier: domainAnalysis.tier,
      date: null,
      relevance: "high",
      rating: `Tier ${domainAnalysis.tier} · ${domainAnalysis.finalScore}/100`,
    });
  }

  if (gdeltResult.status === "fulfilled") {
    apiStatus.gdelt = "ok";
    evidence.push(...gdeltResult.value.slice(0, 5));
  } else {
    apiStatus.gdelt = rejectedStatus(gdeltResult.reason);
    warnings.push(`GDELT: ${String(gdeltResult.reason)}`);
  }

  if (wikiResult.status === "fulfilled") {
    apiStatus.wikipedia = "ok";
    evidence.push(...wikiResult.value);
  } else {
    apiStatus.wikipedia = rejectedStatus(wikiResult.reason);
    warnings.push(`Wikipedia: ${String(wikiResult.reason)}`);
  }

  // PASS 11: registry — search by domain for context coverage
  const domLegacyCounts = {
    factcheck: evidence.filter((e) => e.source === "Fact Check").length,
    gdelt:     evidence.filter((e) => e.source === "GDELT").length,
    wikipedia: evidence.filter((e) => e.source === "Wikipedia").length,
  };
  let registry: RegistryEnrichment;
  try {
    registry = await runRegistry(domain, apiStatus, domLegacyCounts);
    evidence.push(...registry.evidence);
  } catch (e) {
    registry = {
      evidence: [],
      coverage: [
        { adapter: "googleFactCheck", name: "Google Fact Check Tools", status: apiStatus.factcheck, itemCount: domLegacyCounts.factcheck, requiresKey: true },
        { adapter: "gdelt", name: "GDELT 2.0", status: apiStatus.gdelt, itemCount: domLegacyCounts.gdelt, requiresKey: false },
        { adapter: "wikimedia", name: "Wikipedia", status: apiStatus.wikipedia, itemCount: domLegacyCounts.wikipedia, requiresKey: false },
      ],
      coverageLevel: "low",
      category: "general",
    };
    warnings.push(`Source registry failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const domPass = clusterEvidence(evidence);
  const domEvidence = domPass.dedupedEvidence.slice().sort(sortEvidence);
  const domClusters = clusterEvidence(domEvidence).clusters;

  const noEvidence = domEvidence.length === 0;
  const breakdown = computeScoreBreakdown(domEvidence);
  const sourceQualityScore = domainAnalysis?.finalScore ?? breakdown.score;
  const evidenceVerdict = computeVerdict(domEvidence);

  const { labels: domLabels, missing: domMissing } = computeClaimLabels({
    claim: rawDomain,
    evidence: domEvidence,
    verdict: evidenceVerdict,
  });

  if (spoofing.isSpoof) {
    warnings.push(
      `Spoofing signals: ${spoofing.signals.join("; ")}${spoofing.matchedBrand ? ` — looks like ${spoofing.matchedBrand}` : ""}`
    );
  }

  const transparencyReport = computeTransparency(null, spoofing, pathSuspicion);
  const transparency: TransparencyIntel = {
    score: transparencyReport.score,
    level: transparencyReport.level,
    factors: transparencyReport.factors,
  };
  const domainIntel: DomainIntel = {
    category: domainAnalysis?.category ?? "unknown",
    categoryInferred: domainAnalysis?.categoryInferred ?? true,
    spoofingSignals: spoofing.signals,
    spoofedBrand: spoofing.matchedBrand,
    pathSignals: [],
  };

  const domSafety = buildSafetyPayload({
    input: rawDomain,
    mode: "domain",
    verdict: evidenceVerdict,
    evidence: domEvidence,
    domainAnalysis,
    apiStatus,
  });

  const deepReport: DeepReport | null = depth === "deep"
    ? buildDeepReport({
        input: rawDomain,
        mode: "domain",
        verdict: evidenceVerdict,
        evidence: domEvidence,
        sourceQualityScore,
        claimLabels: domLabels,
        apiStatus,
      })
    : null;

  return {
    mode: "domain",
    depth,
    input: rawDomain,
    normalizedInput: domain,
    sourceQualityScore,
    scoreFactors: breakdown.factors,
    evidenceVerdict,
    evidence: domEvidence,
    clusters: domClusters,
    claimLabels: domLabels,
    missingSignals: domMissing,
    searchVariants: [],
    safetyWarnings: domSafety.safetyWarnings,
    confidence: domSafety.confidence,
    suggestions: domSafety.suggestions,
    sourceCoverage: registry.coverage,
    coverageLevel: registry.coverageLevel,
    claimCategory: registry.category,
    domainAnalysis,
    domainIntel,
    pageIntel: null,
    transparency,
    summary: buildDomainSummary(domain, domainAnalysis),
    deepReport,
    noEvidence,
    checkedAt: new Date().toISOString(),
    warnings,
    apiStatus,
  };
}

const SOURCE_ORDER: Record<EvidenceItem["source"], number> = {
  "Fact Check": 0,
  "Domain DB":  1,
  "GDELT":      2,
  "Wikipedia":  3,
};

const EVIDENCE_TYPE_ORDER: Record<EvidenceItem["evidenceType"], number> = {
  disputes: 0,
  supports: 1,
  unclear:  2,
  related:  3,
};

function sortEvidence(a: EvidenceItem, b: EvidenceItem): number {
  const sourceDelta = SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
  if (sourceDelta !== 0) return sourceDelta;
  const typeDelta = EVIDENCE_TYPE_ORDER[a.evidenceType] - EVIDENCE_TYPE_ORDER[b.evidenceType];
  if (typeDelta !== 0) return typeDelta;
  return (b.domainScore ?? 0) - (a.domainScore ?? 0);
}

function buildClaimSummary(
  evidence: EvidenceItem[],
  verdict: CheckResult["evidenceVerdict"],
  apiStatus: ApiStatus
): string {
  if (evidence.length === 0) {
    const fcNote =
      apiStatus.factcheck === "no-key"
        ? " (Google Fact Check disabled — set FACTCHECK_API_KEY to enable.)"
        : "";
    return `No fact-check matches, news coverage, or encyclopedia entries found.${fcNote} Absence of coverage does not confirm or deny the claim.`;
  }

  const fcCount    = evidence.filter((e) => e.source === "Fact Check").length;
  const newsCount  = evidence.filter((e) => e.source === "GDELT").length;
  const wikiCount  = evidence.filter((e) => e.source === "Wikipedia").length;

  const parts: string[] = [];
  if (fcCount > 0)    parts.push(`${fcCount} fact-check review${fcCount > 1 ? "s" : ""}`);
  if (newsCount > 0)  parts.push(`${newsCount} news article${newsCount > 1 ? "s" : ""}`);
  if (wikiCount > 0)  parts.push(`${wikiCount} encyclopedia entr${wikiCount > 1 ? "ies" : "y"}`);

  const tail =
    verdict === "disputes"  ? " Fact-checkers have rated this claim FALSE or MISLEADING." :
    verdict === "supports"  ? " Fact-checkers have rated this claim TRUE or ACCURATE." :
    verdict === "mixed"     ? " Fact-checkers gave mixed or conflicting ratings." :
                              " No direct fact-check rating — only contextual coverage.";

  return `Found ${parts.join(", ")}.${tail}`;
}

function buildUrlSummary(
  domain: string,
  analysis: ReturnType<typeof scoreDomain>,
  evidence: EvidenceItem[],
  page: Awaited<ReturnType<typeof analyzePage>> | null
): string {
  const parts: string[] = [];
  if (analysis && analysis.tier !== "?") {
    parts.push(`${domain} — ${analysis.label} (Tier ${analysis.tier}, ${analysis.finalScore}/100).`);
  } else if (analysis) {
    parts.push(`${domain} is not in our reputation database (${evidence.length} related item(s) found).`);
  }
  if (analysis?.category) {
    const meta = CATEGORY_META[analysis.category];
    parts.push(`Category: ${meta.label}${analysis.categoryInferred ? " (inferred)" : ""}.`);
  }
  if (page?.fetched) {
    const tag: string[] = [];
    tag.push(page.byline ? "byline ✓" : "no byline");
    tag.push(page.publishedAt ? "dated ✓" : "no date");
    tag.push(page.outboundLinks > 0 ? `${page.outboundLinks} citations` : "no citations");
    parts.push(`Page check: ${tag.join(", ")}.`);
  } else if (page?.fetchError) {
    parts.push(`Page could not be fetched (${page.fetchError}).`);
  }
  return parts.join(" ");
}

function buildDomainSummary(
  domain: string,
  analysis: ReturnType<typeof scoreDomain>
): string {
  if (!analysis) return `No data found for ${domain}.`;
  const catLabel = analysis ? CATEGORY_META[analysis.category].label : "Unknown";
  if (analysis.tier === "?") {
    return `${domain} is not in our local reputation database. Inferred category: ${catLabel}. TLD-based score ${analysis.finalScore}/100.`;
  }
  return `${domain} — Tier ${analysis.tier} ${catLabel} (${analysis.finalScore}/100). ${analysis.notes}`;
}


interface DeepReportArgs {
  input: string;
  mode: CheckResult["mode"];
  verdict: CheckResult["evidenceVerdict"];
  evidence: EvidenceItem[];
  sourceQualityScore: number | null;
  claimLabels: CheckResult["claimLabels"];
  apiStatus: ApiStatus;
}

function buildDeepReport(args: DeepReportArgs): DeepReport {
  const breakdown = breakdownClaim(args.input);
  const timeline = buildTimeline(args.evidence);
  const research = buildResearchSummary(args);

  // Corroborating: top-3 evidence items by domain score that are either
  // explicitly supporting or contextually related from credible outlets.
  const corroborating: number[] = [];
  const conflicting: number[] = [];

  const scored = args.evidence
    .map((e, i) => ({ e, i, score: e.domainScore ?? 0 }))
    .sort((a, b) => b.score - a.score);

  for (const { e, i } of scored) {
    if (corroborating.length >= 5) break;
    if (e.evidenceType === "disputes") continue;
    if (e.domainScore !== null && e.domainScore >= 60) corroborating.push(i);
  }

  // Conflicting: any item whose stance differs from the majority fact-check stance,
  // PLUS any explicit "disputes" item when verdict is "supports" (and vice versa).
  const fcItems = args.evidence.map((e, i) => ({ e, i })).filter((x) => x.e.source === "Fact Check");
  const stanceCounts: Record<string, number> = {};
  for (const { e } of fcItems) {
    stanceCounts[e.evidenceType] = (stanceCounts[e.evidenceType] ?? 0) + 1;
  }
  const majorityStance = Object.keys(stanceCounts).sort((a, b) => stanceCounts[b] - stanceCounts[a])[0];
  for (const { e, i } of fcItems) {
    if (majorityStance && e.evidenceType !== majorityStance &&
        (e.evidenceType === "supports" || e.evidenceType === "disputes" || e.evidenceType === "unclear")) {
      conflicting.push(i);
    }
  }

  return {
    claimBreakdown: {
      parts: breakdown.parts,
      entities: breakdown.entities,
      numbers: breakdown.numbers,
      dates: breakdown.dates,
      quantifiers: breakdown.quantifiers,
      hasNegation: breakdown.hasNegation,
      hasHedging: breakdown.hasHedging,
    },
    timeline: {
      granularity: timeline.granularity,
      earliestDate: timeline.earliestDate,
      latestDate: timeline.latestDate,
      totalDatedItems: timeline.totalDatedItems,
      buckets: timeline.buckets,
    },
    corroborating,
    conflicting,
    researchSummary: {
      headline: research.headline,
      body: research.body,
      strongest: research.strongest,
      weakest: research.weakest,
      reliabilityNotes: research.reliabilityNotes,
      limitations: research.limitations,
    },
  };
}

interface SafetyPayload {
  safetyWarnings: { id: string; text: string; tone: "warn" | "bad" | "neutral" }[];
  confidence: CheckResult["confidence"];
  suggestions: CheckResult["suggestions"];
}

function buildSafetyPayload(opts: {
  input: string;
  mode: CheckResult["mode"];
  verdict: CheckResult["evidenceVerdict"];
  evidence: EvidenceItem[];
  domainAnalysis: CheckResult["domainAnalysis"];
  apiStatus: ApiStatus;
}): SafetyPayload {
  const { input, mode, verdict, evidence, domainAnalysis, apiStatus } = opts;
  const hasFactCheckKey = apiStatus.factcheck !== "no-key";

  // Claim-quality warnings only apply to "claim" mode; for url/domain modes
  // we still run the analyzer to catch obvious issues (e.g., "I think...").
  const quality: ClaimQualityResult =
    mode === "claim"
      ? analyzeClaimQuality(input)
      : { warnings: [], isVague: false, isOpinion: false, isFuturePrediction: false, needsExpert: null };

  const evidenceWarnings: SafetyWarning[] = deriveSafetyWarnings({
    evidence,
    verdict,
    domainAnalysisKnown: domainAnalysis ? domainAnalysis.tier !== "?" : null,
  });

  if (mode === "claim" && !hasFactCheckKey && verdict === "related-only") {
    evidenceWarnings.push({
      id: "fact-check-unavailable",
      tone: "neutral",
      text: "Google Fact Check Tools was disabled (no API key). A 'related-only' verdict may simply mean we couldn't consult fact-checkers.",
    });
  }

  const allWarnings: SafetyWarning[] = [...quality.warnings, ...evidenceWarnings];

  const confidence = computeConfidence({
    verdict,
    evidence,
    quality,
    hasFactCheckKey,
    apiStatus,
  });

  const suggestions = buildSuggestions({
    verdict,
    evidence,
    quality,
    hasFactCheckKey,
    apiStatus,
    confidence,
    warnings: allWarnings,
  });

  return {
    safetyWarnings: allWarnings,
    confidence,
    suggestions,
  };
}

// ── PASS 11: registry integration ─────────────────────────────────────────
//
// Runs the new source adapters (arxiv/crossref/pubmed/openalex/courtlistener/
// hackernews/reddit/rss) ALONGSIDE the existing legacy fan-out for FC/GDELT/
// Wikipedia. The legacy fan-out is preserved because it carries the carefully-
// tuned PASS 5 query-variant expansion + stance reconciliation.

const NEW_ADAPTERS = ["arxiv", "crossref", "pubmed", "openalex", "courtlistener", "hackernews", "reddit", "rss"];
const LEGACY_ADAPTERS = ["googleFactCheck", "gdelt", "wikimedia"];

interface RegistryEnrichment {
  evidence: EvidenceItem[];
  coverage: SourceCoverageEntry[];
  coverageLevel: "low" | "medium" | "high";
  category: ClaimCategory;
}

async function runRegistry(
  query: string,
  apiStatusLegacy: ApiStatus,
  legacyItemCounts: { factcheck: number; gdelt: number; wikipedia: number }
): Promise<RegistryEnrichment> {
  const detected = detectCategory(query);
  // Run only the NEW adapters via the registry — exclude legacy ones we already
  // fanned out for, so we don't double-count.
  const ms = await multiSearch(query, {
    timeoutMs: 9_000,
    maxResultsPerAdapter: 6,
    exclude: LEGACY_ADAPTERS,
    claimCategories: detected.all,
  });

  // Map new evidence → legacy EvidenceItem shape
  const newEvidence: EvidenceItem[] = ms.evidence.map((n) => {
    const merged = toEvidenceItem(n);
    return merged as EvidenceItem;
  });

  // Build the full coverage list: legacy 3 + every new adapter that was attempted.
  const coverage: SourceCoverageEntry[] = [
    {
      adapter: "googleFactCheck", name: "Google Fact Check Tools",
      status: apiStatusLegacy.factcheck,
      itemCount: legacyItemCounts.factcheck,
      requiresKey: true,
    },
    {
      adapter: "gdelt", name: "GDELT 2.0",
      status: apiStatusLegacy.gdelt,
      itemCount: legacyItemCounts.gdelt,
      requiresKey: false,
    },
    {
      adapter: "wikimedia", name: "Wikipedia",
      status: apiStatusLegacy.wikipedia,
      itemCount: legacyItemCounts.wikipedia,
      requiresKey: false,
    },
    // Then every new adapter the registry tried, in routed order
    ...ms.results.map((r): SourceCoverageEntry => ({
      adapter: r.adapter,
      name: r.name,
      status: r.status,
      itemCount: r.items.length,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs,
      requiresKey: r.requiresKey,
    })),
    // Adapters that weren't routed for this category get "not-applicable"
    ...NEW_ADAPTERS.filter((id) => !ms.adaptersTried.includes(id)).map((id): SourceCoverageEntry => ({
      adapter: id,
      name: id,
      status: "not-applicable",
      itemCount: 0,
      requiresKey: id === "googleFactCheck",
    })),
  ];

  // Coverage level: count adapters with status=ok AND items > 0
  const okCount = coverage.filter((c) => c.status === "ok" && c.itemCount > 0).length;
  const coverageLevel: "low" | "medium" | "high" =
    okCount >= 5 ? "high" : okCount >= 2 ? "medium" : "low";

  return { evidence: newEvidence, coverage, coverageLevel, category: detected.primary };
}
