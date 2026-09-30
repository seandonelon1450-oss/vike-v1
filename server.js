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
const { getProvider, providerInfo } = require('./providers');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

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
