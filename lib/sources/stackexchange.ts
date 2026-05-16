import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId } from "./types";

const ENDPOINT = "https://api.stackexchange.com/2.3/search/advanced";

export const stackExchangeAdapter: SourceAdapter = {
  id: "stackexchange",
  name: "Stack Exchange",
  categories: ["technology", "science-research"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);
    const params = new URLSearchParams({
      order: "desc",
      sort: "relevance",
      q: query,
      site: "stackoverflow",
      pagesize: String(max),
      filter: "default",
    });

    try {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ProofbaseBot/1.0 public evidence research",
        },
        signal: opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 10_000),
      });
      if (res.status === 429) return done("rate-limited", start, [], "Stack Exchange rate limit reached");
      if (!res.ok) return done("error", start, [], `Stack Exchange returned ${res.status}`);

      const data = await res.json();
      if (data?.error_message) return done("error", start, [], data.error_message);
      const items = ((data?.items ?? []) as StackQuestion[]).map((item) => mapQuestion(item, query)).filter(Boolean) as NormalizedEvidence[];
      return done("ok", start, items);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface StackQuestion {
  title?: string;
  link?: string;
  tags?: string[];
  score?: number;
  answer_count?: number;
  is_answered?: boolean;
  creation_date?: number;
  last_activity_date?: number;
  owner?: { display_name?: string };
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return {
    adapter: stackExchangeAdapter.id,
    name: stackExchangeAdapter.name,
    status,
    items,
    errorMessage: msg,
    durationMs: Date.now() - start,
    categories: stackExchangeAdapter.categories,
    requiresKey: false,
  };
}

function mapQuestion(question: StackQuestion, query: string): NormalizedEvidence | null {
  if (!question.title || !question.link) return null;
  const matched = q(query).filter((token) => `${question.title} ${(question.tags ?? []).join(" ")}`.toLowerCase().includes(token));
  const answered = question.is_answered ? "answered" : "not marked answered";
  const date = question.creation_date ? new Date(question.creation_date * 1000).toISOString() : null;
  return {
    id: evidenceId("stackexchange", question.link),
    title: decodeHtml(question.title).slice(0, 220),
    sourceName: "Stack Overflow",
    sourceDomain: "stackoverflow.com",
    url: question.link,
    publishedAt: date,
    snippet: `${answered}. Score ${question.score ?? 0}; ${question.answer_count ?? 0} answer(s). Tags: ${(question.tags ?? []).join(", ") || "none"}.`,
    evidenceType: "related",
    sourceCategory: "blog",
    confidence: Math.min(1, 0.18 + matched.length * 0.12 + (question.is_answered ? 0.08 : 0)),
    rawProvider: "stackexchange",
    matchedTerms: matched,
    limitations: [
      "Technical Q&A context, not a primary source. Accepted answers can be outdated or incomplete.",
    ],
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
