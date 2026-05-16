import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";
import { searchFactCheck as legacyFc } from "@/lib/factcheck";

export const googleFactCheckAdapter: SourceAdapter = {
  id: "googleFactCheck",
  name: "Google Fact Check Tools",
  categories: ["general", "politics-news", "health-medical", "celebrity-viral", "legal-court"],
  requiresKey: true,
  available: () => !!process.env.FACTCHECK_API_KEY && process.env.FACTCHECK_API_KEY.trim().length > 0,
  async search(query, opts) {
    const start = Date.now();
    const fc = await legacyFc(query);

    let status: AdapterResult["status"];
    switch (fc.status) {
      case "ok":            status = "ok"; break;
      case "no-key":        status = "no-key"; break;
      case "rate-limited":  status = "rate-limited"; break;
      default:              status = "error"; break;
    }

    const queryTokens = q(query);
    const max = Math.min(opts?.maxResults ?? 10, 20);
    const normalized: NormalizedEvidence[] = fc.items.slice(0, max).map((it) => {
      const titleLow = it.title.toLowerCase();
      const matched = queryTokens.filter((t) => titleLow.includes(t));
      const baseConf = it.relevance === "high" ? 0.9 : it.relevance === "medium" ? 0.55 : 0.25;
      // If the snippet contains our reconciliation tag, lower the confidence so
      // downstream UIs can show "this match is weaker than the rating suggests".
      const tagged = it.snippet.includes("may not apply") || it.snippet.includes("stance inverted");
      return {
        id: evidenceId("googleFactCheck", it.url),
        title: it.title,
        sourceName: it.publisher,
        sourceDomain: hostOf(it.url) || it.domain,
        url: it.url,
        publishedAt: it.date ? new Date(it.date + "T00:00:00Z").toISOString() : null,
        snippet: it.snippet,
        evidenceType: it.evidenceType,
        sourceCategory: "fact-checker",
        confidence: tagged ? baseConf * 0.6 : baseConf,
        rawProvider: "googleFactCheck",
        matchedTerms: matched,
        limitations: [
          tagged
            ? "Rating was demoted because it does not match the user's exact wording."
            : "Stance comes directly from the reviewing publisher's textual rating.",
        ],
      };
    });

    return {
      adapter: "googleFactCheck",
      name: "Google Fact Check Tools",
      status,
      items: normalized,
      errorMessage: fc.errorMessage,
      durationMs: Date.now() - start,
      categories: googleFactCheckAdapter.categories,
      requiresKey: true,
    };
  },
};

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
