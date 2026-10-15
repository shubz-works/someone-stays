# Progress

Prototype for a case-study submission. Brief: `idea.txt`. All data is fictional.

## Status (2026-10-14)
- Built: four navigator tabs, young person's view, three profiles, role toggle, Reset, localStorage persistence.
- Full demo journey (brief section 12) passes in a headless smoke test and the first two screens were checked in Chrome.
- Pushed to `git@github.com:shubz-works/someone-stays.git` (branch `main`).
- GitHub Pages enabled by the user: https://shubz-works.github.io/someone-stays/ (static, so sample mode only).

## Decisions made with the user
- Stack: vanilla HTML/CSS/JS, no packages. `server.js` is a dependency-free Node proxy for live AI.
- AI: live via Claude API when `ANTHROPIC_API_KEY` is set, otherwise clearly labelled sample/template fallbacks.
- The user has no API key and will not demo the LLM buttons, so sample mode is the demo mode.
- Background is soft off-white yellow (`--bg` in `style.css`), easy to change.

## Sample-mode behaviour
- Plan, service suggestions and notes translation: prepared output only for Asha's exact example input.
- Briefing and handover: rules-based template from the records, labelled "not AI".
- Plan translation to Hindi: needs live AI.

## Not done / known gaps
- Voice upload/recording (optional in brief) not built.
- Printable handover not built; a .txt download exists.
- Live AI path is untested (no key available).
- Screens 3 and 4 and the Young person's view have not been checked visually in a real browser.

## Bugs found and fixed
- `state` was initialised before date helpers (fixed by moving the `load()` call below them).
- `server.js` JSON-encoded static file Buffers, so the page showed raw bytes (fixed in `send()`).
