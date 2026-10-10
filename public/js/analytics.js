/* Private analytics beacon — no cookies, no fingerprinting, no PII. Page + event only. */
(function () {
  function send(event) {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: location.pathname, event: event || 'pageview' }),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* silent */ }
  }
  window.trackEvent = function (event) { send(event); };
  function pv() { send('pageview'); }
  if (document.readyState === 'complete' || document.readyState === 'interactive') pv();
  else document.addEventListener('DOMContentLoaded', pv);
})();
