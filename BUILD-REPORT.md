# VIKe — Phase 2 Build Report (priority 3)

Built 2026-10-10 by the phase-2 build worker, per the Arbor build brief
(`~/workspace/handoffs/MUSE-HANDOFF.md`) §9D + §9A + §10. Local source:
`~/workspace/vike-v1`. No local `vike-v1-restore` directory exists on this
machine — noted, nothing there was touched. The live founding-circle payment
link on vike-v1-restore was NOT removed or altered (see §"Left untouched").

## What was built

**Design system (§10), full restyle.** `public/styles.css` rewritten:
paper #FAF8F4 / ink #1C1A17, garnet accent #9B2F4E / hover #7F2740 /
tint #F5E6EB, dark-mode accent #C38295 (dark theme: bg #161513 etc.).
Fraunces headlines + Inter body + JetBrains Mono data — **self-hosted
WOFF2** in `public/fonts/` (latin subsets, ~312KB total; no Google Fonts
links shipped, so no self-hosting follow-up is owed). 56px primary
buttons (radius 10), secondary 1.5px ink border, cards radius 16,
focus ring 2px accent offset 3px, 8pt spacing, 1200px container /
680px reading column, skip link, 44px minimum targets, body ≥16px,
reduced-motion state for every motion technique, OS-follow dark theme +
header toggle stored on device.

**Home = finished work, never a blank box.** Hero: "Get home safe."
First screen opens on: a five-line plain read of a sample conversation
(warning signs in his own words) + three drafted replies, each labeled
"Drafted for you · review before sending." (copy-only, nothing sends) +
a sample Thursday date plan + a "home safe?" check-in that opens a
pre-written text to her trusted friend — nothing sends until she taps
send. All sample content labeled Demo. Never leads with AI.

**Copy cleanup.** Zero ✨ anywhere. Zero customer-facing "aude"
(case-insensitive grep, repo-wide). Zero avoid-list words in
`public/`, `analysis/`, and server code (`AI-powered, chatbot, copilot,
revolutionary, seamless, cutting-edge, unleash, supercharge, magic,
ecosystem, synergy, "How can I help you today?"`, fear words). Zero ®
in text files — ™ only. `elena.html` fixed (A.U.D.é™ → Audrey; Vicky
links now point at this app) and given the powered-by footer line.

**Checkout OFF, "Request an invite" ON.** The founding-circle card is
gone from the UI. Home now has a "Request an invite" form → new
`POST /api/waitlist` (validates email, stores to `data/waitlist.jsonl`,
token-gated `GET /api/waitlist` for Sean). Copy is explicit: "The
founding circle opens after our payment test passes… No charge today,
no card asked." No seat counts shown (none are real yet).

**"powered by Arbor" badge.** Pill with inline-SVG nested-arch mark +
"powered by" (Inter 500, 14px, muted) + "Arbor" (Fraunces 500) — live
text, not an image. In the footer on every page; in the header at
≥1200px (CSS media query). Footer line everywhere:
"Powered by Arbor · The Arbor Group · She owns her data."
(The badge has no href yet — the Arbor Technologies site URL is TBD;
see "Blocked on Sean".)

**Data charter + /data.** The 10-point charter from brief §7 is on
`/data.html` word for word, with working one-tap **Export (text +
JSON)** and **Delete all** wired to the browser evidence store, plus an
honest "what we hold" section. PDF export is labeled "coming soon"
rather than faked. `/trust.html` 301-redirects to `/data.html`.
Export + delete are also reachable from the app's Evidence tab and the
header nav on every screen.

**Screenshot privacy (verified in code, stated in the app).**
There is no upload path: `grep` over routes and client code confirms no
file/image upload endpoint, no multipart handling, no base64 image
pipeline — `/api/analyze` accepts text only. So there are no uploads to
delete and no EXIF/metadata to strip. This is stated plainly on the
Analyze tab and the Trust tab: "V.I.K.e doesn't accept photo or
screenshot uploads — you paste text — so there's nothing uploaded,
nothing stored, and no photo metadata to strip."

**About + FAQ.** `/about.html` carries the acronym — V.I.K.e =
Vigilant Intuition, Kinetic Yoke, escort — plus "what she never does"
and a "Talk to a person" button (mailto). Acronym appears on the About
page only, never in heroes. `/faq.html` answers "Does Arbor use AI?"
plainly (yes; demo mode is pattern matching, labeled on screen; never
trains on her data), plus crisis-service, data, and invite questions.
No fear words, no victim imagery.

**Deploy prep.** `render.yaml`: Node, `autoDeploy: true`, Starter plan
(webhook service per brief), `healthCheckPath: /healthz`,
`startCommand: node server.js`. `GET /healthz` → 200 `{"ok":true}`.
New `.github/workflows/ci.yml`: fails if the ephemeral-registry
hostname appears in the repo (the literal appears **only** in that
workflow file — never in docs, reports, READMEs, code, or comments),
fails on customer-facing "aude", boots the server and asserts
`/healthz` → 200 `{"ok":true}`.

**Secrets.** None in code/chat/logs. Stripe keys, webhook secret, and
analytics token live only in env (`.env` / Render dashboard);
`.env.example` holds placeholders; runtime `data/*.jsonl` is now
git-ignored.

## What I verified (actual checks run)

- Booted locally: `node server.js` → "listening on port 3000",
  provider mock/demo.
- HTTP 200 on `/`, `/welcome.html`, `/data`, `/data.html`,
  `/about.html`, `/faq.html`, `/contact.html`, `/elena.html`,
  `/api/config`; `/healthz` → 200 `{"ok":true}`;
  `/trust.html` → 301 → `/data.html`.
- `/` contains "Get home safe.", "Request an invite", four
  "Drafted for you · review before sending." labels, powered-by footer
  line; zero aude/✨/copilot on the page.
- `POST /api/analyze` (mock) → severity + 3 drafts + demo flag.
- `POST /api/waitlist` → `{"ok":true}` for a valid email,
  400 with plain message for a bad one.
- Fonts serve: `/fonts/fraunces-normal-100_900.woff2` → 200
  `font/woff2`.
- Greps (excluding `.git`, `node_modules`): zero customer-facing
  "aude"; zero avoid-list words in `public/`, `analysis/`,
  `providers/`, `server.js`, `billing-server.js`, `package.json`;
  zero ® in text files; the ephemeral-registry hostname literal
  appears only in `.github/workflows/ci.yml`; no key material
  (`sk_test_/sk_live_/whsec_` etc.) anywhere in code/config.
- `git status` clean after commit (see below).

Not run: Lighthouse (no browser harness here), real-device check of
the ≥1200px header badge, the CI workflow itself (runs on push).

## Left untouched (per instructions)

- The live founding-circle payment link on **vike-v1-restore** — not
  removed, not altered. Note for Sean: vike-v1-restore still takes
  $39/mo payments while this build shows "Request an invite" on vike-v1;
  the two services now tell different stories (see "Blocked on Sean").
- `public/js/billing.js` + `billing-server.js` webhook code remain in
  the repo, dormant, for when checkout opens.

## Blocked on Sean — exactly what he needs to do

1. **Stripe test before any live charge (brief §9 rule, still pending
   everywhere):** in the Stripe dashboard create the webhook endpoint
   `https://vike-v1.onrender.com/api/billing/webhook` for event
   `checkout.session.completed`, then set `STRIPE_WEBHOOK_SECRET` (plus
   `STRIPE_SECRET_KEY`, `STRIPE_FOUNDING_PRICE_ID`) in the Render
   dashboard Environment for vike-v1. Then run one real test charge +
   refund and confirm the founder lands in the ledger. Until then the
   UI correctly says "Request an invite."
2. **Decide the vike-v1 vs vike-v1-restore story:** the restore service
   still accepts live $39/mo founding payments; this build's vike-v1
   says checkout is off. Either point the domain at one service or
   confirm which one is canonical before any announcement.
3. **GitHub push + Render deploy:** local commits only (auth paused) —
   push `main` so Render auto-deploys via `render.yaml`; confirm the
   deploy goes green on `/healthz`. Paid Starter plan is declared in
   `render.yaml` (webhook service); no purchase was clicked here.
4. **Arbor Technologies site URL** (badge link — currently a
   non-linked pill; brief says link TBD).
5. **Garnet sign-off:** #9B2F4E family is built in but marked
   "proposed" in the brief — don't print/trademark until he OKs.
6. **elena.html:** story page keeps its dark cinematic skin with names
   fixed; needs his call — full §10 redesign or retire.
7. **Lawyer review** (per brief §13): data charter, VIKe terms.

## Files added / changed (all in `~/workspace/vike-v1`)

Added: `render.yaml`, `.github/workflows/ci.yml`,
`public/about.html`, `public/data.html`, `public/faq.html`,
`public/fonts/` (6 WOFF2), `BUILD-REPORT.md`. Removed:
`public/trust.html` (301 → `/data.html`).
Rewrote: `public/styles.css`, `public/index.html`,
`public/js/app.js`. Updated: `server.js` (/healthz, /api/waitlist,
trust redirect), `public/welcome.html`, `public/contact.html`,
`public/elena.html`, `public/manifest.webmanifest`, `package.json`
description, `analysis/prompt.js` (copilot → screening), `README.md`
(design law), `.gitignore` (ignore `data/*.jsonl`).
