'use strict';
const path = require('path');
const fs = require('fs');
/* =====================================================================
 * V.I.K.e V1 — billing (server side).
 *
 * Stripe Checkout for founding memberships. Test mode first: use an
 * sk_test_ key and flip to sk_live_ only when founding memberships
 * open for real money.
 *
 * Env:
 *   STRIPE_SECRET_KEY      sk_test_... / sk_live_... (server only, NEVER
 *                          in the browser, never in git — set it in the
 *                          hosting dashboard's environment variables)
 *   STRIPE_FOUNDING_PRICE_ID  price_... for the "Founding Membership"
 *                          product created in the Stripe dashboard
 *   STRIPE_WEBHOOK_SECRET  whsec_... from the webhook endpoint created
 *                          in the Stripe dashboard (optional but
 *                          recommended once a public URL exists)
 *   APP_URL                public URL, e.g. https://vike.example.com
 *                          (falls back to the request's own host)
 *
 * The server is stateless: it never stores payments. After Stripe
 * redirects back, the CLIENT verifies its own session via
 * GET /api/billing/session/:id and keeps the founding flag in its own
 * browser (localStorage) — same as the evidence file.
 * =================================================================== */

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) {
    const err = new Error('STRIPE_SECRET_KEY is not set.');
    err.statusCode = 503;
    err.publicMessage = 'Founding memberships aren\u2019t open yet — checkout is not configured.';
    throw err;
  }
  // Lazy require so the app boots fine with no Stripe installed/configured.
  const Stripe = require('stripe');
  return Stripe(key);
}

function priceId() {
  const id = process.env.STRIPE_FOUNDING_PRICE_ID || '';
  if (!id) {
    const err = new Error('STRIPE_FOUNDING_PRICE_ID is not set.');
    err.statusCode = 503;
    err.publicMessage = 'Founding memberships aren\u2019t open yet — the membership price is not configured.';
    throw err;
  }
  return id;
}

/* Never leak key material. The UI uses this for its honesty badge. */
function status() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return {
    checkoutReady: Boolean(key && process.env.STRIPE_FOUNDING_PRICE_ID),
    testMode: key.startsWith('sk_test_'),
    liveMode: key.startsWith('sk_live_')
  };
}

function appUrl(req) {
  const env = (process.env.APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  return `${proto}://${req.get('host')}`;
}

/* Create a one-time Checkout Session for the founding membership. */
async function createCheckoutSession(req) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId(), quantity: 1 }],
    success_url: `${appUrl(req)}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl(req)}/?checkout=cancelled`,
    metadata: { product: 'vike-founding-membership', app: 'V.I.K.e' }
  });
  return session.url;
}

/* The buyer proves THEY paid: retrieve their session straight from Stripe. */
async function verifySession(sessionId) {
  if (!sessionId || !/^cs_(test|live)_/.test(sessionId)) {
    const err = new Error('Bad session id.');
    err.statusCode = 400;
    throw err;
  }
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === 'paid',
    email: session.customer_details && session.customer_details.email ? session.customer_details.email : null,
    testMode: !session.livemode
  };
}

/* Stripe -> us: payment confirmations. Verifies the signature so random
 * callers can't fake a "paid" event. Persists each payer to the founders
 * ledger (data/founders.jsonl) — ephemeral disk, same as nominations. */
const FOUNDERS_FILE = path.join(__dirname, 'data', 'founders.jsonl');

function recordFounder(session) {
  const cd = session.customer_details || {};
  const entry = {
    ts: new Date().toISOString(),
    email: cd.email || null,
    name: cd.name || null,
    amount_total: session.amount_total != null ? session.amount_total / 100 : null,
    currency: (session.currency || 'usd').toUpperCase(),
    session_id: session.id,
    livemode: !!session.livemode,
    mode: session.mode || null
  };
  try {
    fs.appendFileSync(FOUNDERS_FILE, JSON.stringify(entry) + '\n');
  } catch (e) { console.error('[vike] could not write founders ledger:', e.message); }
  return entry;
}

function listFounders() {
  try {
    return fs.readFileSync(FOUNDERS_FILE, 'utf8').split('\n').filter(Boolean)
      .map((ln) => { try { return JSON.parse(ln); } catch (e) { return null; } })
      .filter(Boolean);
  } catch (e) { return []; }
}

function handleWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret) {
    // No webhook configured yet — acknowledge so Stripe doesn't retry storms.
    return res.status(200).json({ received: false, reason: 'webhook not configured' });
  }
  let event;
  try {
    // Signature verification needs no API key — construct without one.
    const stripe = require('stripe')();
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('[vike] webhook signature invalid:', err.message);
    return res.status(400).json({ error: 'Invalid signature.' });
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const f = recordFounder(s);
    console.log(`[vike] FOUNDER #${listFounders().length} paid: email=${f.email} amount=${f.amount_total} ${f.currency} livemode=${f.livemode}`);
  }
  res.json({ received: true });
}

module.exports = { status, createCheckoutSession, verifySession, handleWebhook, listFounders };
