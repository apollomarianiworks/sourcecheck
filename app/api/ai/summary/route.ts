import { NextRequest, NextResponse } from "next/server";
import { rateLimit, ipFromRequest, pruneBuckets } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface EvidenceBlock {
  title?: string;
  url?: string;
  publisher?: string | null;
  domain?: string | null;
  snippet?: string;
  stance?: "supports" | "disputes" | "context" | "unclear";
  score?: number | null;
  date?: string | null;
}

interface Body {
  claim?: string;
  intent?: "summarize-claim" | "summarize-evidence" | "explain-disagreement" | "suggest-followups" | "debate-brief";
  evidence?: EvidenceBlock[];
}

interface SummaryResponse {
  status: "ok" | "rule-based" | "no-key" | "error";
  text: string;
  bullets: string[];
  evidenceUsed: { title: string; url: string; publisher: string }[];
  limitations: string[];
  confidence: "high" | "medium" | "low" | "insufficient";
  model: string;
  llmUsed: boolean;
  generatedAt: string;
}

export async function POST(req: NextRequest) {
  pruneBuckets();
  const rl = rateLimit(ipFromRequest(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const claim = (body.claim ?? "").trim();
  if (!claim) return NextResponse.json({ error: "claim is required" }, { status: 400 });

  const evidence = (body.evidence ?? []).filter((e) => typeof e?.url === "string" && /^https?:\/\//.test(e.url ?? ""));
  if (evidence.length === 0) {
    const empty: SummaryResponse = {
      status: "rule-based",
      text: `No evidence was attached. I will not summarise this claim without sources — that would be hallucinating. Add at least one source URL to the claim, then ask again.`,
      bullets: [],
      evidenceUsed: [],
      limitations: ["The assistant only summarises evidence the user has actually attached."],
      confidence: "insufficient",
      model: "rule-based",
      llmUsed: false,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ summary: empty });
  }

  // ── Always produce a deterministic rule-based summary first ──
  const fallback = buildRuleBasedSummary(claim, evidence);

  // ── If an LLM key is configured, try to call it — strict source-grounded ──
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const llm = await callAnthropic(claim, evidence);
      return NextResponse.json({ summary: llm, fallback });
    } catch (e) {
      const err: SummaryResponse = {
        ...fallback,
        limitations: [
          `LLM call failed: ${e instanceof Error ? e.message : String(e)}. Falling back to deterministic summary.`,
          ...fallback.limitations,
        ],
        status: "rule-based",
      };
      return NextResponse.json({ summary: err });
    }
  }

  return NextResponse.json({ summary: fallback });
}

// ──────────────────────────────────────────────────────────────────────────
// Deterministic source-grounded summary (zero hallucination)
// ──────────────────────────────────────────────────────────────────────────

function buildRuleBasedSummary(claim: string, evidence: EvidenceBlock[]): SummaryResponse {
  const supports = evidence.filter((e) => e.stance === "supports");
  const disputes = evidence.filter((e) => e.stance === "disputes");
  const context  = evidence.filter((e) => !e.stance || e.stance === "context" || e.stance === "unclear");

  const lines: string[] = [];
  let confidence: SummaryResponse["confidence"] = "insufficient";

  if (supports.length > 0 && disputes.length > 0) {
    lines.push(`Evidence is mixed: ${supports.length} source(s) support the claim and ${disputes.length} source(s) dispute it.`);
    confidence = "low";
  } else if (supports.length > 0) {
    lines.push(`Evidence suggests support: ${supports.length} attached source(s) align with the claim. This is NOT a guarantee of truth.`);
    confidence = supports.length >= 3 ? "medium" : "low";
  } else if (disputes.length > 0) {
    lines.push(`Evidence suggests dispute: ${disputes.length} attached source(s) contradict the claim. This is NOT a guarantee of falsehood.`);
    confidence = disputes.length >= 3 ? "medium" : "low";
  } else {
    lines.push(`Only contextual sources are attached — none directly support or dispute the claim.`);
    confidence = "insufficient";
  }

  const publishers = unique(evidence.map((e) => e.publisher || e.domain).filter(Boolean) as string[]);
  if (publishers.length > 0) {
    lines.push(`Sources cited: ${publishers.slice(0, 5).join(", ")}${publishers.length > 5 ? `, +${publishers.length - 5} more` : ""}.`);
  }

  const scores = evidence.map((e) => e.score).filter((s): s is number => typeof s === "number");
  if (scores.length > 0) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    lines.push(`Average source quality across attached evidence: ${avg}/100.`);
  }

  const bullets: string[] = [];
  for (const e of evidence.slice(0, 6)) {
    const stance = e.stance ?? "context";
    const date = e.date ? ` (${e.date.slice(0, 10)})` : "";
    bullets.push(`[${stance}] ${e.title || e.url}${e.publisher ? ` — ${e.publisher}` : ""}${date}`);
  }

  return {
    status: "rule-based",
    text: lines.join(" "),
    bullets,
    evidenceUsed: evidence.slice(0, 12).map((e) => ({
      title: e.title || e.url || "(no title)",
      url: e.url!,
      publisher: e.publisher || e.domain || "unknown",
    })),
    limitations: [
      "This summary is rule-based — it only describes the attached evidence, never extrapolates beyond it.",
      "It does NOT verify whether sources are accurate; it counts and categorises them.",
      `Context sources (${context.length}) are not used to infer stance.`,
    ],
    confidence,
    model: "rule-based",
    llmUsed: false,
    generatedAt: new Date().toISOString(),
  };
}

function unique<T>(xs: T[]): T[] { return Array.from(new Set(xs)); }

// ──────────────────────────────────────────────────────────────────────────
// Optional Anthropic call — strictly source-grounded
// ──────────────────────────────────────────────────────────────────────────

async function callAnthropic(claim: string, evidence: EvidenceBlock[]): Promise<SummaryResponse> {
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const sourceBlock = evidence
    .map((e, i) => `[${i + 1}] ${e.stance ?? "context"} — ${e.title || e.url}
URL: ${e.url}
Publisher: ${e.publisher || e.domain || "unknown"}
Date: ${e.date || "unknown"}
Snippet: ${(e.snippet || "").slice(0, 300)}`)
    .join("\n\n");

  const system =
    `You summarise factual claims using ONLY the evidence the user provides. ` +
    `Hard rules:\n` +
    `- NEVER cite a URL the user did not supply.\n` +
    `- NEVER invent statistics, quotes, or sources.\n` +
    `- NEVER say "100% true" or "100% false".\n` +
    `- If a source you cite supports vs disputes the claim, say so — but only ` +
    `use the user-supplied "stance" label, do not infer your own.\n` +
    `- Reply in 2-4 short sentences then a bulleted list of which source backs which point.\n` +
    `- If the evidence is too thin, say "insufficient evidence" — don't extrapolate.`;

  const user = `Claim: ${claim}\n\nAttached evidence:\n${sourceBlock}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic returned ${res.status} — ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data?.content?.[0]?.text ?? "").toString().trim();

  return {
    status: "ok",
    text: text || "(empty response)",
    bullets: [],
    evidenceUsed: evidence.slice(0, 12).map((e) => ({
      title: e.title || e.url || "(no title)",
      url: e.url!,
      publisher: e.publisher || e.domain || "unknown",
    })),
    limitations: [
      "Generated by Claude with strict source-grounding instructions. The model is prompted to refuse citations of any URL not in the attached evidence.",
      "Stance labels come from the user's submission — the model is not allowed to reclassify them.",
    ],
    confidence: evidence.length >= 4 ? "medium" : "low",
    model,
    llmUsed: true,
    generatedAt: new Date().toISOString(),
  };
}
