'use strict';
/* =====================================================================
 * V.I.K.e V1 — server.
 *
 * A thin, STATELESS backend:
 *  - serves the static frontend (public/)
 *  - POST /api/analyze  -> runs the configured provider (mock or real LLM)
 *  - GET  /api/config   -> tells the UI which provider is active,
 *                          so it can label itself honestly
 *
 * Privacy posture: the server keeps no database and logs no request
 * bodies. Analysis inputs exist only for the duration of the request.
 * The evidence file lives in the user's own browser (localStorage) —
 * the server never sees it. See README "Privacy & data handling".
 * =================================================================== */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getProvider, providerInfo } = require('./providers');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

/* ---- Health check (Render healthCheckPath). ---- */
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* ---- Trust page moved: /trust.html -> /data.html ---- */
app.get('/trust.html', (req, res) => res.redirect(301, '/data.html'));

/* ---- Stripe billing (webhook needs the RAW body for signature
 * verification, so it is registered BEFORE the JSON parser). ---- */
const billing = require('./billing-server');

app.post('/api/billing/webhook',
  express.raw({ type: 'application/json', limit: '256kb' }),
  (req, res) => billing.handleWebhook(req, res));

app.use(express.json({ limit: '256kb' }));

/* Serve the app. */
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders(res, filePath) {
    // Never cache the shell; assets are fine to cache briefly.
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

/* Which brain is plugged in? The UI uses this for its honesty badge. */
app.get('/api/config', (req, res) => {
  res.json({
    app: 'V.I.K.e',
    version: '1.0.0-v1-scaffold',
    provider: providerInfo(),
    privacy: {
      serverStoresInputs: false,
      serverStoresEvidence: false,
      evidenceLocation: 'this browser only (localStorage)',
      trainsOnData: false
    }
  });
});

/* Analyze pasted/dictated text. Stateless: nothing is persisted. */
app.post('/api/analyze', async (req, res) => {
  const text = String((req.body && req.body.text) || '').slice(0, 20000);
  if (!text.trim()) {
    return res.status(400).json({ error: 'Nothing to analyze — paste or dictate the message first.' });
  }
  try {
    const provider = getProvider();
    const result = await provider.analyze({ text });
    res.json(result);
  } catch (err) {
    // Log the failure mode, never the input.
    console.error('[vike] analyze failed:', err.message);
    res.status(502).json({
      error: 'Analysis failed. Check your connection and try again. ' +
        (providerInfo().demoMode ? '' : 'If this persists, verify LLM_API_KEY / LLM_BASE_URL.')
    });
  }
});

/* ---- Billing API (Stripe Checkout for founding memberships) ---- */
app.get('/api/billing/status', (req, res) => res.json(billing.status()));
app.post('/api/billing/checkout', async (req, res) => {
  try {
    const url = await billing.createCheckoutSession(req);
    res.json({ url });
  } catch (err) {
    console.error('[vike] checkout failed:', err.message);
    res.status(err.statusCode || 500).json({ error: err.publicMessage || 'Checkout failed. Try again.' });
  }
});
/* The client verifies its own session after Stripe redirects back.
 * (No accounts in V1 — the founding flag lives in the buyer's browser.) */
app.get('/api/billing/session/:id', async (req, res) => {
  try {
    res.json(await billing.verifySession(req.params.id));
  } catch (err) {
    console.error('[vike] session verify failed:', err.message);
    res.status(err.statusCode || 500).json({ error: 'Could not verify payment.' });
  }
});


/* ---- Private analytics: pageviews + conversion events. No third parties,
 * no cookies, no fingerprinting, no PII. Page + event + timestamp only. ---- */
const ANALYTICS_FILE = path.join(__dirname, 'data', 'analytics.jsonl');
app.post('/api/track', (req, res) => {
  const body = req.body || {};
  const page = String(body.page || '').slice(0, 120);
  let event = String(body.event || 'pageview').slice(0, 40);
  if (!/^[a-z0-9_]+$/.test(event)) event = 'pageview';
  if (!page.startsWith('/')) return res.status(400).json({ ok: false });
  const line = JSON.stringify({ ts: new Date().toISOString(), page, event,
    ua: String(req.headers['user-agent'] || '').slice(0, 120) }) + '\n';
  try { fs.appendFileSync(ANALYTICS_FILE, line); } catch (e) { /* best effort */ }
  res.json({ ok: true });
});
app.get('/api/stats', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ ok: false });
  let lines = [];
  try { lines = fs.readFileSync(ANALYTICS_FILE, 'utf8').split('\n').filter(Boolean); }
  catch (e) { /* no data yet */ }
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const pageviewsByPage = {}, eventsByType = {};
  let totalPageviews = 0;
  for (const ln of lines) {
    try {
      const r = JSON.parse(ln);
      if (new Date(r.ts).getTime() < cutoff) continue;
      eventsByType[r.event] = (eventsByType[r.event] || 0) + 1;
      if (r.event === 'pageview') {
        totalPageviews++;
        pageviewsByPage[r.page] = (pageviewsByPage[r.page] || 0) + 1;
      }
    } catch (e) { /* skip bad lines */ }
  }
  res.json({ ok: true, days: 30, totalPageviews, pageviewsByPage, eventsByType });
});

/* ---- Founder nominations: one woman per founder. Stored on the server's
 * ephemeral disk (same caveat as analytics — check /api/nominations
 * regularly and export). Viewable only with the analytics token. ---- */
const NOMINATIONS_FILE = path.join(__dirname, 'data', 'nominations.jsonl');
app.post('/api/nominate', (req, res) => {
  const body = req.body || {};
  const yourName = String(body.yourName || '').trim().slice(0, 120);
  const herName = String(body.herName || '').trim().slice(0, 120);
  const herContact = String(body.herContact || '').trim().slice(0, 160);
  const why = String(body.why || '').trim().slice(0, 500);
  if (!yourName || !herName) {
    return res.status(400).json({ ok: false, error: 'Your name and her name are required.' });
  }
  const line = JSON.stringify({ ts: new Date().toISOString(), yourName, herName, herContact, why }) + '\n';
  try { fs.appendFileSync(NOMINATIONS_FILE, line); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Could not save — try again.' }); }
  try {
    fs.appendFileSync(ANALYTICS_FILE, JSON.stringify({
      ts: new Date().toISOString(), page: '/nominate', event: 'nomination', ua: ''
    }) + '\n');
  } catch (e) { /* best effort */ }
  res.json({ ok: true });
});
app.get('/api/nominations', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ ok: false });
  let nominations = [];
  try {
    nominations = fs.readFileSync(NOMINATIONS_FILE, 'utf8').split('\n').filter(Boolean)
      .map((ln) => { try { return JSON.parse(ln); } catch (e) { return null; } })
      .filter(Boolean);
  } catch (e) { /* no data yet */ }
  res.json({ ok: true, count: nominations.length, nominations });
});
app.get('/api/founders', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ ok: false });
  const founders = billing.listFounders();
  res.json({ ok: true, count: founders.length, founders });
});

/* ---- Invite waitlist: the founding circle checkout stays OFF until the
 * Stripe webhook is set up and one real test charge + refund passes
 * (Sean's step). Until then the UI says "Request an invite." Stored on
 * the server's ephemeral disk — same caveat as nominations: check
 * /api/waitlist regularly and export. Viewable only with the token. ---- */
const WAITLIST_FILE = path.join(__dirname, 'data', 'waitlist.jsonl');
app.post('/api/waitlist', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email so we can reach you.' });
  }
  const line = JSON.stringify({ ts: new Date().toISOString(), name, email }) + '\n';
  try { fs.appendFileSync(WAITLIST_FILE, line); }
  catch (e) { return res.status(500).json({ ok: false, error: 'Could not save — try again.' }); }
  try {
    fs.appendFileSync(ANALYTICS_FILE, JSON.stringify({
      ts: new Date().toISOString(), page: '/waitlist', event: 'waitlist_join', ua: ''
    }) + '\n');
  } catch (e) { /* best effort */ }
  res.json({ ok: true });
});
app.get('/api/waitlist', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ ok: false });
  let entries = [];
  try {
    entries = fs.readFileSync(WAITLIST_FILE, 'utf8').split('\n').filter(Boolean)
      .map((ln) => { try { return JSON.parse(ln); } catch (e) { return null; } })
      .filter(Boolean);
  } catch (e) { /* no data yet */ }
  res.json({ ok: true, count: entries.length, waitlist: entries });
});

/* Friendly 404 for API typos. */
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));

/* JSON error responses for the API (malformed JSON bodies, etc.)
 * instead of Express's default HTML error page. */
app.use('/api', (err, req, res, next) => {
  console.error('[vike] api error:', err.message);
  res.status(err.status || 400).json({ error: 'Bad request — expected JSON.' });
});




app.listen(PORT, () => {
  const info = providerInfo();
  console.log(`[vike] V.I.K.e V1 listening on port ${PORT}`);
  console.log(`[vike] provider=${info.id} demoMode=${info.demoMode} model=${info.model}`);
});
