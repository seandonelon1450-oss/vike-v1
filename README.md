# V.I.K.e™ V1 — working web app scaffold

**What this is:** the real, working V1 web app — not the frozen static demo
(`v-i-k-e-prototype` artifact). Mobile-first, runs beautifully in iPhone
Safari. Ruthlessly narrow scope: summon → screen → draft → evidence file.

**Lead use case:** dating-conversation screening — V.I.K.e as the "blocker"
between the user and the dating apps (the **"anti-Rizz"**). The triage engine
itself stays generic (it analyzes any pasted text), but prompts, patterns,
samples, and copy are tuned for match screening: love-bombing, future-faking,
romance-scam markers, off-app pressure, negging, breadcrumbing, story
inconsistency.

**Stack (and why):** Node.js + Express backend serving a static vanilla-JS
frontend. One dependency (`express`), zero build step — every file is readable
by a human. The backend is deliberately thin and **stateless**: it serves the
app and proxies LLM calls so API keys never touch the browser. **No database**
— the evidence file lives in the user's browser (localStorage). That's both
$0 and the honest privacy story.

**Design law:** V.I.K.e must never feel like software. The frontend carries the
frozen prototype's cinematic guardian identity — near-black depths, cool
white, cyan edge-light, her face present on every screen, her voice in the
copy ("Show me what he sent", "What I would say", "Trust, plainly"). If a
screen starts feeling like a dashboard instead of her presence, simplify or
remove it. All styling lives in `public/styles.css`; `public/js/app.js` emits
no inline styles.

---

## Quick start (local)

```bash
cd ~/workspace/vike-v1
npm install
node server.js        # → http://localhost:3000
```

Requires Node 18+. The app runs end-to-end immediately in **demo mode**
(pattern-based analysis, zero keys, zero cost) — clearly labeled in the UI.

---

## Providers: demo vs real AI

`providers/index.js` selects the brain:

| `LLM_PROVIDER` | Behavior |
|---|---|
| `mock` (default) | Deterministic pattern engine. Full pipeline works, $0. Labeled "Demo analysis" everywhere. Confidence capped — heuristics are not judgment. |
| `openai` + `LLM_API_KEY` | Real LLM via any OpenAI-compatible API. System prompt built from the shared rubric + Sean's frameworks. Falls back to mock (with a console warning) if the key is missing. |

### Adding a real LLM key

```bash
cp .env.example .env
# edit .env:
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini            # default; any chat model works
# LLM_BASE_URL=https://api.openai.com/v1   # override for compatible providers
node server.js
```

The UI badge flips from "Demo analysis" to "AI analysis" automatically
(via `GET /api/config`).

### API costs (honest numbers)

At founding-circle scale (a few dozen users, occasional analyses) on a
small model class (`gpt-4o-mini` or equivalent): **single dollars per month**.
A few hundred analyses ≈ $1–5. This is not the expensive part of the business.

---

## Deploying free ($0)

**Recommended: Render (free tier).**
1. Push this folder to a GitHub repo.
2. Render → New → Web Service → connect the repo.
3. Build command: `npm install` · Start command: `node server.js`.
4. Add environment variables (`LLM_PROVIDER`, `LLM_API_KEY`, …) in Render's dashboard — never commit `.env`.
5. Deploy. You get `https://<name>.onrender.com`.

**Caveat:** Render's free tier sleeps after ~15 min idle (cold start ~30–60s).
Fine for beta; upgrade ($7/mo) or move hosts when it matters.

**Alternatives:** Fly.io (free allowances, no sleep), Railway (trial credits),
or any VPS later. The app is a plain Node process — it runs anywhere.

**iPhone note:** open the URL in Safari → Share → *Add to Home Screen* for an
app-like icon (manifest included). Voice dictation uses the Web Speech API,
which **iPhone Safari does not support** — paste is the primary input there,
and the app says so honestly instead of showing a dead button. Tap-to-talk
summon ("Hey Vicky™") always works; read-aloud uses the device's speech
synthesis.

---

## Where Sean's frameworks plug in (Omni integration points)

Sean's "Omni algorithm" materials are pending — the seams are ready:

1. **`frameworks/`** — drop `.md`/`.txt` files here (e.g. `omni-algorithm.md`).
   They are injected into the real-LLM system prompt under "Founder
   frameworks" on **every** analysis call, re-read per request (no restart).
   Never exposed to the frontend. See `frameworks/README.md`.
2. **`analysis/rubric.js`** — the shared taxonomy (severity scale, cue
   definitions, postures). Both the mock and the real-LLM prompt derive from
   it; edit the language here and both providers follow.
3. **`analysis/prompt.js`** — system-prompt builder. Dating-screening lens,
   honesty rules (no lie-detection claims, calibrated confidence), and the
   JSON contract live here.
4. **`providers/mock.js`** — the demo pattern engine. Full-strength
   heuristics per Sean's authorization ("no holding back"): weighted
   multi-signal patterns plus **composite signals** (romance-scam sequence =
   off-app move + fraud markers; intimacy-at-speed = love-bombing +
   future-faking). Clearly labeled as demo, bypassed entirely when a real
   provider is configured.

---

## Payments (Stripe Checkout — wired, keys not set)

`billing-server.js` + `public/js/billing.js` implement founding-membership
checkout via Stripe's hosted Checkout page. The secret key never leaves
the server; the browser only ever sees a redirect URL.

**Setup (test mode first):**
1. In the Stripe dashboard (with **Test mode** on): Developers → API keys
   → copy the **secret** key (`sk_test_…`).
2. Product catalog → create "Founding Membership" → copy its Price ID
   (`price_…`).
3. Set env vars where the app is hosted (hosting dashboard → environment):
   `STRIPE_SECRET_KEY`, `STRIPE_FOUNDING_PRICE_ID`, and later
   `STRIPE_WEBHOOK_SECRET` + `APP_URL` once a public URL exists.
4. Test with card `4242 4242 4242 4242`, any future date, any CVC.

Until the keys are set, the "Join the founding circle" button says
checkout isn't open yet — no fake payments, ever. Flip to `sk_live_…`
only when founding memberships open for real money.

---

## Circle — private invites (trust flywheel)

The growth loop is a protected woman inviting her trusted circle — private,
curated, premium. No social SDKs, no public referral widgets, nothing viral.

- **Personal invite code:** each device generates one `VK-XXXXXX` code on
  first visit (unambiguous alphabet, stored in `localStorage` under
  `vike.invites.v1`). Shown on the **Circle** tab with a copy button.
- **Share flow:** "Share with someone you trust" — optional name (so the
  user remembers), then the phone's native private share sheet
  (`navigator.share`; clipboard fallback with a plain message including the
  code and the app URL). The share is logged locally: who was invited and when.
- **Attribution:** each side records its half — my device logs who I shared
  with; the invitee's device stores `invitedBy: <code>` when they redeem a
  code. So "who invited whom" is tracked as far as a local-first V1 honestly
  can. A server-side invite registry (cross-device verification, founding
  code quotas) is future work if Sean wants it.
- **Redeem:** "Were you invited?" accepts a `VK-XXXXXX` code, rejects the
  user's own code, and shows the inviter's code as confirmation.
- Share records can be removed by the user; like the evidence file, all of
  this lives in the browser — the server never sees invite codes.

---

## Privacy & data handling (the honest version)

- **V1 processes pasted input on the server** to run the analysis. That's the
  speed tradeoff while the private on-device V2 is built. The Privacy screen
  says this in plain language.
- **No training on user data.** Inputs exist only for the request; the server
  logs no request bodies and keeps no database.
- **The evidence file never leaves the device** (browser localStorage). The
  server cannot see, back up, or recover it.
- **Delete means delete** — clearing entries removes them from the browser;
  there is nothing server-side to clear.
- **Honestly labeled:** demo analyses are badged; the evidence export states
  it is a personal log, **not** forensic chain-of-custody; imminent-danger
  results show human emergency resources with "V.I.K.e cannot intervene."
- **V2 north star** (on-device processing) is named as aspiration only — the
  copy never claims V1 does it.

---

## What's stubbed / mocked

- **Analysis brain** — mock pattern engine until an API key is added.
- **Payments** — stub only (see above).
- **Export** — clean `.txt`/text download (dependency-free, works offline).
  PDF export is a later upgrade, not V1.
- **Cross-message inconsistency** — single-message heuristics now; comparing
  across a saved history is future work (evidence entries store excerpts, so
  the data will be there).
- **Wake word** — "Hey Vicky™" is tap-to-summon (+ in-browser speech
  recognition where supported). True always-on listening is a native-app
  capability, not a web one.
- **Voice** — device speech synthesis for read-aloud (voice quality varies by
  device). Commissioned voice talent is a production step.

---

## What Sean must provide

1. **LLM API key** (when ready for real AI) — OpenAI or compatible; set as
   `LLM_API_KEY` env var. Cost: dollars/month at beta scale.
2. **His Omni/background materials** — drop into `frameworks/` whenever ready.
3. **Stripe account** — only when he decides to open founding memberships.
4. **Domain (optional)** — point it at the Render/Fly URL when he wants one.
5. **Ongoing friend feedback** — the demo is already circulating; keep feeding
   reactions back in.

## Limitations (said plainly)

- Demo-mode analysis is heuristics, not AI — useful for workflow validation,
  not for judgment. Confidence scores are capped accordingly.
- A 3–4B-class on-device model was the V2 story; V1's real provider is
  cloud-backed by design (speed + $0). The privacy screen discloses this.
- No accounts, no sync, no backup: one browser = one evidence file. Losing
  the browser data loses the file. Say it to users before they rely on it.
- US emergency resources are hardcoded; internationalize before any
  non-US launch.
- This scaffold has not had a security audit. Get one before storing real
  users' abuse evidence in production (budget ~$5–15k, per the real-build plan).
