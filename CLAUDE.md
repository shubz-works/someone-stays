# Someone Stays: instructions for Claude

Simple prototype web app for a case-study submission. Read `idea.txt` (the brief) and `progress.md` first.

## Rules
- Keep it simple: vanilla HTML/CSS/JS, no frameworks, no npm packages, no build step.
- All people, institutions, navigators and services are fictional. Never add real data, diagnoses or sensitive history.
- Discuss the approach with the user before any substantive change; trivial fixes can go straight in.
- The user has no API key and does not demo the LLM buttons. Sample mode must keep working. Never present a prepared output as generated from different input.
- Never commit `.env` or any API key.

## Layout
- `index.html`, `style.css`, `app.js`: the whole front end. State lives in localStorage (`someoneStays.v1`); volatile UI state is in the `V` object.
- `server.js`: static server plus `POST /api/ai` proxy to the Claude API. Optional; the app works without it.
- Handlers are in `H`, wired by `data-act` (clicks) and `data-act-change` (selects/dates) via event delegation. Views are template-string functions (`viewDash`, `viewConv`, `viewFind`, `viewProg`, `viewYoung`).

## Rules the app must keep
- A navigator's approval alone never makes a plan Agreed; only the young person's view can.
- Only the young person can set a referral to "Support received"; "I still need help" reopens it and creates a navigator task.
- Service suggestions use directory entries only; unknown IDs are rejected.
- Each participant's data stays separate.

## Run and deploy
- Local: `node server.js`, then open http://localhost:3000 (or open `index.html` directly).
- Deploy: GitHub Pages from `main` root at https://shubz-works.github.io/someone-stays/. Push to `git@github.com:shubz-works/someone-stays.git`. The `gh` CLI is logged in as `aryan1113`, which cannot manage the `shubz-works` repo settings.
- After changes, rerun the walkthrough in brief section 12 and check the result in a browser.
