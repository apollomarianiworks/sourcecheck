# Proofbase Desktop Roadmap

PASS 21 does not build a native desktop app. It prepares Proofbase so the web app can become an installable research workspace first, then graduate to a lighter desktop shell.

## Preferred Stack

- Prefer Tauri over Electron for the first native desktop build.
- Keep Next.js as the product surface while desktop-only capabilities live behind a narrow bridge.
- Avoid desktop-only data models until the web/PWA workspace model is stable.

## Desktop App Shell Direction

- Multi-pane research workspace with search, evidence, notes, and source preview panes.
- Workspace tabs for saved searches, debate briefs, source comparisons, and active routines.
- Keyboard-first navigation for new search, command palette, tab switching, save session, export, and source compare.
- Local-first saved research collections with explicit sync later.
- Export systems for Markdown, JSON, PDF, and evidence packets.

## Offline And Caching Architecture

- Keep the PWA service worker focused on shell safety and static assets.
- Add IndexedDB for saved evidence packets once result schemas stabilize.
- Cache only user-saved research, not private scraped pages or opaque third-party content.
- Mark stale evidence clearly and require refresh before presenting old research as current.

## Desktop Capabilities To Add Later

- Side-by-side source comparison.
- Multi-window research sessions.
- Local notes attached to evidence cards.
- Routine dashboards and optional notifications.
- Import/export of research workspaces.
- Browser handoff from extensions or share targets.

## Guardrails

- Do not imply offline evidence is current.
- Do not scrape private or login-gated content.
- Keep all citations tied to actual retrieved evidence.
- Preserve Vercel/Firebase compatibility for the web app.
