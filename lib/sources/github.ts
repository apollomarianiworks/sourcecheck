import type { SourceAdapter, AdapterResult, NormalizedEvidence } from "./types";
import { evidenceId, hostOf } from "./types";

const ISSUE_ENDPOINT = "https://api.github.com/search/issues";
const REPO_ENDPOINT = "https://api.github.com/search/repositories";

export const githubAdapter: SourceAdapter = {
  id: "github",
  name: "GitHub",
  categories: ["technology", "science-research"],
  requiresKey: false,
  available: () => true,
  async search(query, opts) {
    const start = Date.now();
    const max = Math.min(opts?.maxResults ?? 5, 10);

    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ProofbaseBot/1.0 public evidence research",
      };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

      const [issues, repos] = await Promise.allSettled([
        fetchGithub(`${ISSUE_ENDPOINT}?q=${encodeURIComponent(`${query} in:title,body type:issue`)}&per_page=${Math.ceil(max / 2)}`, headers, opts?.timeoutMs),
        fetchGithub(`${REPO_ENDPOINT}?q=${encodeURIComponent(query)}&per_page=${Math.floor(max / 2) || 1}`, headers, opts?.timeoutMs),
      ]);

      const items: NormalizedEvidence[] = [];
      const errors: string[] = [];
      if (issues.status === "fulfilled") items.push(...((issues.value.items ?? []) as GithubIssue[]).map((item) => mapIssue(item, query)).filter(Boolean) as NormalizedEvidence[]);
      else errors.push(issues.reason instanceof Error ? issues.reason.message : String(issues.reason));
      if (repos.status === "fulfilled") items.push(...((repos.value.items ?? []) as GithubRepo[]).map((item) => mapRepo(item, query)).filter(Boolean) as NormalizedEvidence[]);
      else errors.push(repos.reason instanceof Error ? repos.reason.message : String(repos.reason));

      if (errors.length > 0 && items.length === 0) {
        const status = errors.some((e) => /rate limit|403|429/i.test(e)) ? "rate-limited" : "error";
        return done(status, start, [], errors.join("; "));
      }
      return done("ok", start, items.slice(0, max), errors[0]);
    } catch (e) {
      return done("error", start, [], e instanceof Error ? e.message : String(e));
    }
  },
};

interface GithubIssue {
  html_url?: string;
  title?: string;
  body?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  repository_url?: string;
  user?: { login?: string };
  comments?: number;
}

interface GithubRepo {
  html_url?: string;
  full_name?: string;
  description?: string;
  stargazers_count?: number;
  updated_at?: string;
  language?: string;
  owner?: { login?: string };
}

async function fetchGithub(url: string, headers: Record<string, string>, timeoutMs = 10_000) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 403 || res.status === 429) throw new Error(`GitHub rate limit or access limit (${res.status})`);
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return res.json();
}

function done(status: AdapterResult["status"], start: number, items: NormalizedEvidence[], msg?: string): AdapterResult {
  return {
    adapter: githubAdapter.id,
    name: githubAdapter.name,
    status,
    items,
    errorMessage: msg,
    durationMs: Date.now() - start,
    categories: githubAdapter.categories,
    requiresKey: false,
  };
}

function mapIssue(issue: GithubIssue, query: string): NormalizedEvidence | null {
  if (!issue.html_url || !issue.title) return null;
  const text = clean(issue.body ?? "");
  const matched = q(query).filter((token) => `${issue.title} ${text}`.toLowerCase().includes(token));
  const repo = issue.repository_url?.split("/repos/")[1] ?? "GitHub repository";
  return {
    id: evidenceId("github-issue", issue.html_url),
    title: issue.title.slice(0, 220),
    sourceName: `GitHub issue - ${repo}`,
    sourceDomain: "github.com",
    url: issue.html_url,
    publishedAt: issue.created_at ?? issue.updated_at ?? null,
    snippet: text ? text.slice(0, 320) + (text.length > 320 ? "..." : "") : `Issue is ${issue.state ?? "unknown"} with ${issue.comments ?? 0} comment(s).`,
    evidenceType: "related",
    sourceCategory: "blog",
    confidence: Math.min(1, 0.2 + matched.length * 0.13),
    rawProvider: "github",
    matchedTerms: matched,
    limitations: [
      "Public developer discussion. Useful for technical claims, bug reports, and provenance, but not a general truth verdict.",
    ],
  };
}

function mapRepo(repo: GithubRepo, query: string): NormalizedEvidence | null {
  if (!repo.html_url || !repo.full_name) return null;
  const desc = repo.description ?? "";
  const matched = q(query).filter((token) => `${repo.full_name} ${desc}`.toLowerCase().includes(token));
  return {
    id: evidenceId("github-repo", repo.html_url),
    title: repo.full_name,
    sourceName: "GitHub repository",
    sourceDomain: hostOf(repo.html_url) || "github.com",
    url: repo.html_url,
    publishedAt: repo.updated_at ?? null,
    snippet: `${desc || "Public repository."} ${repo.language ? `Language: ${repo.language}. ` : ""}${repo.stargazers_count ?? 0} star(s).`,
    evidenceType: "related",
    sourceCategory: "blog",
    confidence: Math.min(1, 0.18 + matched.length * 0.12),
    rawProvider: "github",
    matchedTerms: matched,
    limitations: ["Repository popularity is not credibility. Use maintainers, docs, commits, and releases for stronger evidence."],
  };
}

function clean(value: string): string {
  return value.replace(/[`*_>#-]/g, " ").replace(/\s+/g, " ").trim();
}

function q(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 4);
}
