# V.I.K.e™ V1 — Build Handoff (2026-09-29)

The original builder hit a runtime fault before delivering its final report.
Verified directly instead: server started, `/api/config` and `/api/analyze`
exercised end-to-end against a love-bombing + off-app-pressure test message.
Pipeline works: severity → cues → contradictions → posture → 3 drafts + silence
rationale → honest demo disclaimer.

## What works today
- `node server.js` → full app at localhost:3000 (iPhone Safari-ready frontend).
- Demo-mode analysis (mock provider): structured triage, manipulation cues,
  response drafts, evidence file in browser localStorage, private invite codes.
- Real-AI path: set `LLM_PROVIDER=openai` + `LLM_API_KEY` and the same pipeline
  runs on a real model; UI badge flips from "Demo analysis" to "AI analysis".
- Omni integration points ready: `frameworks/` (drop-in .md files injected
  into the system prompt), `analysis/rubric.js`, `analysis/prompt.js`.

## What's stubbed
- Payments (`billing.js` fails loudly; Stripe wiring is Sean's step).
- Demo heuristics are blunt by design: the test message's love-bombing
  language was NOT flagged (only off-app pressure was). Real LLM key or
  richer patterns fix this — do not demo-tune beyond honesty.
- Export is .txt (no PDF yet); wake word is tap-to-summon; voice is device TTS.

## What Sean must provide
1. LLM API key (dollars/month at beta scale).
2. Omni/background materials → `frameworks/`.
3. Stripe account (when opening founding memberships).
4. Friend feedback, ongoing.

## Before real users' abuse evidence goes in
- Security audit (budget ~$5–15k, per real-build plan).
- The privacy screen already discloses V1's server-side processing honestly.
