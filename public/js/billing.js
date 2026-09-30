'use strict';
/* =====================================================================
 * V.I.K.e V1 — PAYMENTS (client).
 *
 * Stripe Checkout for founding memberships. The SECRET key never leaves
 * the server: this file asks OUR server to create the Checkout Session,
 * then redirects the buyer to Stripe's hosted checkout page.
 *
 * After payment, Stripe redirects back to /?checkout=success&session_id=…
 * and the session is verified against Stripe before the founding flag
 * is set. The flag lives in this browser's localStorage (same as the
 * evidence file) — V1 has no accounts.
 *
 * Until STRIPE_SECRET_KEY + STRIPE_FOUNDING_PRICE_ID are set on the
 * server, startCheckout() fails loudly and honestly — no fake checkout.
 * =================================================================== */
window.VikeBilling = (function () {
  const PLANS = {
    founding: { id: 'founding', label: 'Founding Membership' }
  };
  const FLAG_KEY = 'vike_founding';

  async function status() {
    const res = await fetch('/api/billing/status');
    if (!res.ok) throw new Error('Billing status unavailable.');
    return res.json();
  }

  async function startCheckout(planId) {
    if (!PLANS[planId]) throw new Error('Unknown plan: ' + planId);
    const st = await status();
    if (!st.checkoutReady) {
      throw new Error('Founding memberships aren\u2019t open yet — checkout is not configured.');
    }
    const res = await fetch('/api/billing/checkout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed. Try again.');
    window.location.href = data.url; // Stripe's hosted checkout page
  }

  /* Called on page load: handle the redirect back from Stripe. */
  async function handleReturn() {
    const q = new URLSearchParams(window.location.search);
    const note = document.getElementById('foundingNote');
    if (q.get('checkout') === 'cancelled') {
      if (note) note.textContent = 'Checkout cancelled — no charge was made. Your spot is still here when you\u2019re ready.';
    }
    if (q.get('checkout') === 'success' && q.get('session_id')) {
      try {
        const res = await fetch('/api/billing/session/' + encodeURIComponent(q.get('session_id')));
        const data = await res.json();
        if (res.ok && data.paid) {
          localStorage.setItem(FLAG_KEY, JSON.stringify({
            paid: true, ts: Date.now(), testMode: !!data.testMode, email: data.email || null
          }));
          if (note) note.textContent = data.testMode
            ? 'Test payment confirmed (no real money moved). You\u2019re marked as a founding member on this device.'
            : 'Welcome to the founding circle. Your membership is confirmed on this device.';
        } else if (note) {
          note.textContent = 'We couldn\u2019t confirm that payment — no founding status was granted. Contact us if you were charged.';
        }
      } catch (e) {
        if (note) note.textContent = 'Payment may have gone through but we couldn\u2019t verify it just now. Keep your Stripe receipt.';
      }
      // Clean the URL so a refresh doesn't re-verify.
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Honest button label: if checkout isn't configured, say so.
    try {
      const st = await status();
      const btn = document.getElementById('foundingBtn');
      if (btn && !st.checkoutReady && note && !note.textContent) {
        note.textContent = 'Founding memberships open soon — checkout isn\u2019t wired up yet.';
      }
    } catch (e) { /* status endpoint down; leave the button as-is */ }
  }

  function getEntitlement() {
    try {
      const raw = localStorage.getItem(FLAG_KEY);
      if (!raw) return { tier: 'free-beta', founding: false };
      const f = JSON.parse(raw);
      return { tier: f.paid ? 'founding' : 'free-beta', founding: !!f.paid, testMode: !!f.testMode };
    } catch (e) {
      return { tier: 'free-beta', founding: false };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleReturn);
  } else {
    handleReturn();
  }

  return { PLANS, startCheckout, getEntitlement, status };
})();
