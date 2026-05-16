# Proofbase

A public **source-quality scanner** for claims, URLs, and domains.
Cross-references the Google Fact Check Tools API, GDELT news archive,
Wikipedia, and a local source-reputation database.

> This is **not** a truth detector. It computes a **Source Quality Score**
> based on the credibility of outlets covering a topic — never on whether
> a claim is "true" or "false". Always verify with primary sources.

**Live pages:**
- `/` — search-first homepage
- `/how-it-works` — what each data source does
- `/limitations` — honest list of what the tool cannot do
- `/history` — your local scan history (browser-only)

---

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS (with custom CRT/phosphor styling)
- No database, no auth, no payments, no paid APIs
- All evidence is fetched live from public APIs — **no mock data anywhere**

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app works out of the box with **GDELT + Wikipedia**. Google Fact Check
Tools (the strongest signal) is **optional but recommended**.

### Optional: enable Google Fact Check Tools

```bash
cp env.example .env.local
# edit .env.local and set FACTCHECK_API_KEY=...
npm run dev   # restart
```

How to get a free Google Fact Check API key (no billing required):

1. Go to <https://console.cloud.google.com/>
2. Create or select a project
3. **APIs & Services → Library → "Fact Check Tools API" → ENABLE**
4. **APIs & Services → Credentials → Create credentials → API key**
5. (Recommended) Restrict the key to the Fact Check Tools API only
6. Paste it into `.env.local`

Without the key, the app still works — it just falls back to news + encyclopedia
context, and the verdict downgrades to "Unverified — context only".

---

## Deploy free on Vercel

1. **Push this repo to GitHub** (or any git host Vercel supports).
   ```bash
   git init
   git add -A
   git commit -m "Initial commit"
   git remote add origin git@github.com:YOUR_USER/proofbase.git
   git push -u origin main
   ```

2. **Import the project on Vercel.**
   - Sign in at <https://vercel.com> (free Hobby tier).
   - Click **Add New → Project**, pick the repo.
   - Vercel auto-detects Next.js — accept the defaults.

3. **(Optional) add the Fact Check API key** in Vercel:
   - Project → **Settings → Environment Variables**
   - Add `FACTCHECK_API_KEY` with your key (see above for how to get one)
   - Apply to Production, Preview, and Development environments
   - Redeploy

4. **Click Deploy.** Vercel builds and hosts on the free tier. The site runs
   24/7 with no cold-start configuration required.

No `vercel.json` is needed — Next.js 16's App Router builds out of the box on
Vercel. The `/api/check` route uses the Node.js runtime (declared in
`app/api/check/route.ts`) so it can do longer-running HTTP fan-out.

**Free-tier limits to keep in mind:**
- Vercel Hobby gives 100 GB-hours of compute/month — generous for personal use.
- Server-side rate limit (30 req/minute per IP) is enforced in-memory; resets
  on each cold start. For production, swap in Upstash Redis or Vercel KV.
- Google Fact Check Tools' free quota is generous but not unlimited — Vercel
  will surface a `rate-limited` state if hit.

### Recommended Vercel environment variables

| Key                   | Purpose                                                   |
|-----------------------|-----------------------------------------------------------|
| `FACTCHECK_API_KEY`   | (Optional) Enables Google Fact Check Tools matching.       |
| `NEXT_PUBLIC_SITE_URL`| Canonical absolute URL (e.g. `https://proofbase.app`) used for OG tags, sitemap.xml, and robots.txt. |

### Launch checklist

- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run dev` boots — visit `/`, `/how-it-works`, `/limitations`, `/compare`, `/history`, `/sitemap.xml`, `/robots.txt`
- [ ] Verify favicon shows in the browser tab (served from `app/icon.svg`)
- [ ] Confirm OG card renders by visiting `/opengraph-image` directly
- [ ] If deploying: set `NEXT_PUBLIC_SITE_URL` so sitemap + robots use the production host
- [ ] (Optional) Add `FACTCHECK_API_KEY`
- [ ] Run one real claim, one URL, one domain end-to-end after deploy
- [ ] Test on a mobile viewport (≤ 380px wide)

---

## Scripts

| Command            | What it does                          |
|--------------------|---------------------------------------|
| `npm run dev`      | Start dev server on port 3000         |
| `npm run build`    | Production build via Turbopack        |
| `npm run start`    | Run the production build              |
| `npm run typecheck`| `tsc --noEmit`                        |

---

## How scoring works

The **Source Quality Score (0–100)** blends:

1. **Median credibility of outlets** covering the topic (top 7 by score)
2. **Fact-checker presence** — bumps the score 40% toward the highest-scoring
   reviewing fact-checker if any Google Fact Check matches are returned
3. **Corroboration breadth** — bonus for distinct Tier-B-or-better outlets
4. **Recency** — small bonus if ≥3 news items are <14 days old
5. **Low-tier penalty** — if every source is under 50, subtract 8

The **verdict label** is separate from the score:

- `SUPPORTS` / `DISPUTES` / `MIXED` — only when fact-check reviews exist
- `RELATED-ONLY` — coverage exists but no direct fact-check ruling
- `NONE` — every source returned empty

Every score result includes a "Why this score" breakdown showing each factor.

---

## Manual test checklist

Run through these to confirm the app behaves end-to-end. None of these are
automated — they're a smoke test the maintainer should walk through after
significant changes.

### Setup
- [ ] `npm install` completes without errors
- [ ] `npm run typecheck` exits with 0 errors
- [ ] `npm run build` exits with 0 errors
- [ ] `npm run dev` and `http://localhost:3000` loads the CRT terminal UI

### Claim mode (no API key — GDELT + Wiki only)
- [ ] Enter a current-events claim (e.g. a recent news headline)
- [ ] Scanner shows loading state with API ticker
- [ ] Result shows verdict banner `RELATED-ONLY`
- [ ] Evidence list has GDELT and/or Wikipedia items
- [ ] API STATUS row shows FACT-CHECK [NO KEY] and a warning is displayed
- [ ] Source Quality Score is shown with breakdown bars
- [ ] "Why this score" lists the factors that contributed

### Claim mode (with FACTCHECK_API_KEY)
- [ ] Enter a well-known debunked claim (e.g. "the great wall of china
      is visible from space")
- [ ] Verdict shows `DISPUTES` (Politifact/Snopes/FactCheck.org should return a
      "False"/"Misleading"-style rating)
- [ ] Fact-check cards appear at the top with the rating quoted

### URL mode
- [ ] Enter a full URL like `https://www.reuters.com/`
- [ ] Domain Report panel shows Tier A
- [ ] Domain DB evidence card appears
- [ ] Bad URL like `not a url` shows a red validation error live
- [ ] Local URL `http://localhost:3000/foo` is rejected by validation

### Domain mode
- [ ] `reuters.com` → Tier A, high score, news coverage
- [ ] `infowars.com` → Tier F, low score, red verdict styling
- [ ] An unlisted domain (e.g. `weatherchannel.com`) shows "Unknown Domain"
      with TLD-only scoring

### Evidence sorting
- [ ] Click AUTHORITY / SOURCE SCORE / RELEVANCE / DATE — list re-orders
- [ ] Active sort key is highlighted green with glow

### History
- [ ] After 2+ scans, the SCAN HISTORY panel appears at the top
- [ ] Each row shows the verdict glyph, mode, input, score, time-ago
- [ ] Clicking a history row populates the input and scrolls to top
- [ ] X button removes a single entry
- [ ] CLEAR ALL HISTORY empties the list
- [ ] Reload page → history persists (it's in `localStorage`)

### Export
- [ ] COPY REPORT puts a markdown report on the clipboard
- [ ] DOWNLOAD .MD saves `proofbase-{mode}-{ts}.md` with the same content
- [ ] Markdown has: header, verdict, score, factors, evidence list

### Errors and edge cases
- [ ] Empty input — SCAN button is disabled
- [ ] Very long claim (>200 chars) — appears in result with a "Query reduced
      to keywords" warning
- [ ] Disable network → SCAN → red error banner with RETRY button
- [ ] An obscure query that nobody covers → amber "NO COVERAGE FOUND" panel
      with suggestions (not a crash)

### UI / accessibility
- [ ] CRT scanlines visible
- [ ] Page is responsive on mobile widths
- [ ] All evidence links open in a new tab
- [ ] Status row icons match the active state

---

## Architecture

```
app/
  page.tsx                Home page; mounts <Scanner/>
  layout.tsx              Root layout (VT323 font, CRT background)
  globals.css             Phosphor glow, scanlines, animations
  api/check/route.ts      POST /api/check — single entry point

lib/
  types.ts                Shared TS types
  domain-scorer.ts        Local domain reputation lookup + TLD bonuses
  normalize.ts            Claim/URL/domain normalization, keyword extraction
  validate.ts             Input validation (URL parsing, domain regex)
  factcheck.ts            Google Fact Check Tools adapter (rating→type)
  gdelt.ts                GDELT DOC 2.0 adapter (no key)
  wikimedia.ts            Wikipedia REST API + MediaWiki search
  scoring.ts              Score computation + factor breakdown + verdict
  history.ts              localStorage history wrapper
  export.ts               Result → Markdown

components/
  Scanner.tsx             Main interactive component
  ModeSelector.tsx        Claim/URL/Domain mode toggle
  ScoreDisplay.tsx        Big number + animated bar
  EvidenceList.tsx        Evidence cards + sort controls
  EvidenceCard.tsx        Single card with type/source badges
  AnalysisPanel.tsx       Found / strongest / weakest / why-score
  ExportButton.tsx        Copy / download .md
  HistoryPanel.tsx        localStorage-backed scan history

data/
  source-rules.json       Source reputation database — domains with categories,
                          baseQualityScore, warning flags, preferred use, and
                          TLD bonuses. Edit this file to add or update sources.
```

---

## Known limitations

- **GDELT is news-only, last 30 days.** Old or niche claims may have no coverage.
- **Domain DB is ~50 domains.** Anything else gets neutral score + TLD bonus only.
- **Rating classification is heuristic.** Most Politifact/Snopes/FactCheck.org
  ratings are caught, but novel publisher verbiage may land in `unclear`.
- **No body extraction.** Snippets are short — full-article scraping is
  deliberately not done (would violate publisher terms of service).
- **No translation.** Non-English claims work only if English coverage exists.
- **No deduplication.** Multiple reviews of the same claim are shown separately
  (this is intentional for corroboration).
- **No retry/backoff.** A single 429 surfaces as a warning, not an automatic retry.

---

## Data sources & licensing

- **Google Fact Check Tools API** — free tier (quota applies); requires an API key
- **GDELT 2.0 DOC API** — public, no key, courtesy of <https://gdeltproject.org>
- **Wikipedia REST + MediaWiki Search APIs** — public, CC BY-SA content
- **Domain reputation DB** — original work in `data/domain-reputation.json`

This project is educational. Verify all claims against primary sources before
citing or sharing.
