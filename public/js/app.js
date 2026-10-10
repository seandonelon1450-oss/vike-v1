'use strict';
/* V.I.K.e V1 — frontend. Vanilla JS, no build step. */

const $ = (id) => document.getElementById(id);
const EVIDENCE_KEY = 'vike_evidence_v1';

const EMERGENCY_US = [
  { label: 'Emergency — call 911', href: 'tel:911' },
  { label: 'National Domestic Violence Hotline — 1-800-799-7233', href: 'tel:18007997233' },
  { label: 'Crisis Text Line — text HOME to 741741', href: 'sms:741741' }
];

const state = {
  provider: { id: 'mock', demoMode: true, model: '' },
  lastAnalysis: null,
  lastInput: ''
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------- boot ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  wireTabs();
  wireGoto();
  wireReveal();
  wireTheme();
  wireSamples();
  wireCircle();
  wireDictate();
  wireAnalyze();
  wireEvidence();
  wireWaitlist();
  wireNominate();
  wireCheckin();
  wireCopyButtons();
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      state.provider = cfg.provider || state.provider;
    }
  } catch (e) { /* offline / dev — stay in demo labeling */ }
  paintBadge();
  renderEvidenceList();
});

function paintBadge() {
  const b = $('modeBadge');
  if (!b) return;
  if (state.provider.demoMode) {
    b.className = 'badge badge-demo';
    b.textContent = 'Demo analysis';
    b.title = 'Pattern-based demo analysis — not AI. See README to plug in a real model.';
  } else {
    b.className = 'badge badge-live';
    b.textContent = 'AI analysis';
    b.title = 'Real AI analysis via configured provider.';
  }
}

/* ---------------- theme: OS default + header toggle, stored on device ---------------- */
function wireTheme() {
  const btn = $('themeToggle');
  if (!btn) return;
  const apply = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    try { localStorage.setItem('vike_theme', t); } catch (e) {}
  };
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    apply(cur === 'dark' ? 'light' : 'dark');
  });
}

/* ---------------- scroll reveals (≤600ms; reduced-motion disables via CSS) ---------------- */
function wireReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target); // once
      }
    });
  }, { threshold: 0.08 });
  els.forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 4, 3) * 60 + 'ms'; // stagger ≤4 × 60ms
    io.observe(el);
  });
}

/* ---------------- tabs ---------------- */
function wireTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}
/* Footer / in-page links that jump to an app screen. */
function wireGoto() {
  document.querySelectorAll('[data-goto]').forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      showScreen(a.dataset.goto);
    });
  });
}
function showScreen(id) {
  const el = $(id);
  if (!el) return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.screen === id));
  window.scrollTo({ top: 0 });
}

/* ---------------- sample data (fictional, clearly labeled) ---------------- */
const SAMPLES = {
  lovebomb: `Hey beautiful, I haven't been able to stop thinking about you since we matched yesterday. I've never felt this kind of connection with anyone. I can already see us traveling the world together — when we move in, we'll get that downtown place you mentioned. You're not like other girls on here. Can I get your number? I hate typing on this app, let's move to WhatsApp.`,
  scam: `Hi dear, I am an engineer on an oil rig and I can't video chat because the signal is bad out here. You are so beautiful for your age, most women wouldn't understand my life. I need a small favor — my bank account is frozen and I need $500 for equipment. You can send it by gift cards. Don't tell anyone, trust me. When I rotate home we will finally meet and I can see us being so happy together.`,
  normal: `Hey! Great matching with you. I saw you like hiking — have you done the greenbelt trail? I'm usually free on weekends if you ever want company on a hike. No pressure at all, just thought I'd say hi.`
};

function wireSamples() {
  document.querySelectorAll('.sample').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sample;
      if (SAMPLES[key]) {
        $('incidentInput').value = SAMPLES[key];
        $('analyzeStatus').textContent = 'Sample loaded (fictional demo data). Press Analyze below — see what I make of it.';
        $('incidentInput').focus();
      }
    });
  });
}

/* ---------------- circle / private invites ---------------- */
const INVITE_KEY = 'vike.invites.v1';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

function loadInvites() {
  try {
    const raw = localStorage.getItem(INVITE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        myCode: d.myCode || null,
        invitedBy: d.invitedBy || null,
        shares: Array.isArray(d.shares) ? d.shares : []
      };
    }
  } catch (e) { /* corrupted — start fresh */ }
  return { myCode: null, invitedBy: null, shares: [] };
}

function saveInvites(d) {
  try { localStorage.setItem(INVITE_KEY, JSON.stringify(d)); } catch (e) { /* storage full/blocked */ }
}

function newInviteCode() {
  let s = 'VK-';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return ok;
  }
}

function inviteMessage(code) {
  return 'I\'m inviting you to V.I.K.e — my personal safety screening for the dating world. ' +
    'Open ' + location.origin + ', tap Circle, and enter my invite code: ' + code + '. ' +
    'This is private — only for people I trust.';
}

function renderCircle() {
  const codeEl = $('myInviteCode');
  if (!codeEl) return;
  const d = loadInvites();
  if (!d.myCode) { d.myCode = newInviteCode(); saveInvites(d); }
  codeEl.textContent = d.myCode;

  const form = $('invitedByForm'), note = $('invitedByNote');
  if (d.invitedBy && d.invitedBy.code) {
    form.classList.add('hidden');
    note.classList.remove('hidden');
    note.innerHTML = 'Welcome in — you were invited by <strong>' + esc(d.invitedBy.code) + '</strong>.';
  } else {
    form.classList.remove('hidden');
    note.classList.add('hidden');
  }

  const list = $('shareList'), empty = $('shareEmpty');
  list.innerHTML = '';
  if (!d.shares.length) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    d.shares.slice().reverse().forEach((s, ri) => {
      const idx = d.shares.length - 1 - ri;
      const li = document.createElement('li');
      const when = new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      li.innerHTML = '<span><strong>' + esc(s.label || 'Someone') + '</strong><br><span class="share-meta">shared ' + esc(when) + '</span></span>';
      const del = document.createElement('button');
      del.className = 'linklike';
      del.textContent = 'remove';
      del.setAttribute('aria-label', 'Remove this share record');
      del.addEventListener('click', () => {
        const dd = loadInvites();
        dd.shares.splice(idx, 1);
        saveInvites(dd);
        renderCircle();
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }
}

function wireCircle() {
  if (!$('myInviteCode')) return;
  renderCircle();

  $('copyCodeBtn').addEventListener('click', async () => {
    const d = loadInvites();
    const ok = await copyText(d.myCode);
    $('copyCodeBtn').textContent = ok ? 'Copied ✓' : 'Copy failed';
    setTimeout(() => { $('copyCodeBtn').textContent = 'Copy'; }, 1600);
  });

  $('shareBtn').addEventListener('click', async () => {
    const d = loadInvites();
    const label = $('shareName').value.trim();
    const msg = inviteMessage(d.myCode);
    let shared = false;
    if (navigator.share) {
      try { await navigator.share({ title: 'V.I.K.e — private invite', text: msg }); shared = true; }
      catch (e) { /* dismissed — not shared */ }
    } else {
      shared = await copyText(msg);
      if (shared) alert('Invite message copied — paste it into a private message to someone you trust.');
    }
    if (shared) {
      d.shares.push({ label: label || 'Someone', at: new Date().toISOString() });
      saveInvites(d);
      renderCircle();
      $('shareName').value = '';
    }
  });

  $('redeemBtn').addEventListener('click', () => {
    const d = loadInvites();
    const code = $('inviterCode').value.trim().toUpperCase();
    if (code === d.myCode) {
      $('inviterCode').value = '';
      $('inviterCode').placeholder = 'That\u2019s your own code — share it with someone else';
      return;
    }
    if (!/^VK-[A-Z0-9]{6}$/.test(code)) {
      $('inviterCode').focus();
      $('inviterCode').placeholder = 'Codes look like VK-XXXXXX';
      return;
    }
    d.invitedBy = { code, at: new Date().toISOString() };
    saveInvites(d);
    renderCircle();
  });
}

/* ---------------- dictation ---------------- */
function wireDictate() {
  const btn = $('dictateBtn'), note = $('dictateNote');
  if (!btn) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    btn.disabled = true;
    note.textContent = 'Voice input isn\u2019t available in this browser (iPhone Safari doesn\u2019t support it) — paste the text instead.';
    return;
  }
  let rec = null, on = false;
  btn.addEventListener('click', () => {
    if (on && rec) { try { rec.stop(); } catch (e) {} return; }
    try {
      rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true;
      rec.onresult = (e) => {
        let final = '';
        for (const r of e.results) if (r.isFinal) final += r[0].transcript + ' ';
        if (final) {
          const box = $('incidentInput');
          box.value = (box.value ? box.value + ' ' : '') + final.trim();
        }
      };
      rec.onend = () => { on = false; btn.textContent = '🎙 Dictate'; note.textContent = ''; };
      rec.onerror = () => { on = false; btn.textContent = '🎙 Dictate'; };
      rec.start();
      on = true; btn.textContent = '■ Stop'; note.textContent = 'Listening… speak naturally.';
    } catch (e) {
      note.textContent = 'Could not start dictation in this browser.';
    }
  });
}

/* ---------------- analysis ---------------- */
function wireAnalyze() {
  const btn = $('analyzeBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const text = $('incidentInput').value.trim();
    const status = $('analyzeStatus'), out = $('results');
    if (!text) { status.textContent = 'Paste or dictate the message first.'; return; }
    btn.disabled = true;
    status.textContent = state.provider.demoMode
      ? 'Running demo analysis (pattern-based, not AI)…'
      : 'V.I.K.e is reading…';
    out.innerHTML = '';
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      state.lastAnalysis = data;
      state.lastInput = text;
      renderResults(data);
      renderDrafts(data);
      renderEmergency(data);
      if (window.trackEvent) window.trackEvent('analysis_run');
      status.textContent = '';
    } catch (e) {
      status.textContent = 'Something went wrong: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

const SEV_INDEX = { 'nuisance': 1, 'harassment': 2, 'threatening': 3, 'imminent-danger': 4 };

function renderResults(a) {
  const idx = SEV_INDEX[a.severity] || 1;
  let meter = '';
  for (let i = 1; i <= 4; i++) meter += `<i class="${i <= idx ? 'on-' + idx : ''}"></i>`;
  const cues = (a.cues || []).map(c => `
    <div class="cue">
      <strong>${esc(c.label || c.type)}</strong>
      ${c.evidence ? `<span class="ev">${esc(c.evidence)}</span>` : ''}
      <p>${esc(c.note || '')}</p>
    </div>`).join('');
  const contras = (a.contradictions || []).map(c => `
    <div class="cue"><strong>Contradiction</strong><p>${esc(c.description)}</p></div>`).join('');
  const lines = (a.personalityLines || []).map(l => {
    const obs = (l.observations || []).map(o => `
      <li>${o.quote ? `<span class="ev">${esc(o.quote)}</span>` : ''}<span>${esc(o.note || '')}</span></li>`).join('');
    const body = obs
      ? `<ul class="pobs">${obs}</ul>`
      : `<p class="pwatch">No markers in this sample. What I\u2019d watch for: ${esc(l.watchFor || '')}</p>`;
    const n = Number(l.markerCount) || 0;
    return `
    <div class="pline">
      <strong>${esc(l.name || 'Pattern line')} <span class="pcount">${n} marker${n === 1 ? '' : 's'}</span></strong>
      ${l.tagline ? `<p class="ptag">${esc(l.tagline)}</p>` : ''}
      ${body}
      <p class="pmean"><b>What this tends to mean:</b> ${esc(l.meaning || '')}</p>
      <p class="pstep"><b>What to do about it:</b> ${esc(l.nextStep || '')}</p>
    </div>`;
  }).join('');

  $('results').innerHTML = `
    <div class="sev-card sev-${esc(a.severity)}">
      <p class="sev-label">${esc(a.severityLabel || a.severity)}</p>
      <p class="sev-desc">${esc(a.severityDescription || '')}</p>
      <div class="meter" aria-hidden="true">${meter}</div>
      <p class="conf">Confidence: ${esc(a.severityConfidence)}/100 — ${esc(a.confidenceNote || '')}</p>
    </div>
    ${cues ? `<h2>What she sees</h2>${cues}` : '<p class="hint">No classic manipulation patterns flagged in this text. That doesn\u2019t mean it felt fine — trust your gut too.</p>'}
    ${contras ? `<h2>Contradictions</h2>${contras}` : ''}
    ${lines ? `<h2>Personality lines — how Vicky reads him</h2>${lines}` : ''}
    <div class="card">
      <strong>Her recommendation: ${esc(a.recommendedPostureLabel || a.recommendedPosture)}</strong>
      <p>${esc(a.postureRationale || '')}</p>
    </div>
    <p class="disclaimer">${esc(a.disclaimer || '')}</p>`;
}

function renderDrafts(a) {
  const box = $('drafts');
  if (!box) return;
  const rec = a.recommendedPosture;
  const cards = (a.drafts || []).map(d => `
    <div class="draft ${d.posture === rec ? 'rec' : ''}">
      <div class="posture">${esc(d.label || d.posture)}</div>
      <p class="draft-label">Drafted for you · review before sending.</p>
      <blockquote>${esc(d.text)}</blockquote>
      <p class="why">${esc(d.rationale || '')}</p>
      <button class="btn-ghost" data-copy="${esc(d.text)}">Copy draft</button>
    </div>`).join('');
  const silence = `
    <div class="draft ${rec === 'silence' ? 'rec' : ''}">
      <div class="posture">Say nothing</div>
      <p class="draft-label">Drafted for you · review before sending.</p>
      <blockquote>(Say nothing.)</blockquote>
      <p class="why">${esc(a.silenceRationale || '')}</p>
    </div>`;
  box.innerHTML = cards + silence + `<p class="disclaimer">${esc(a.disclaimer || '')}</p>`;
  wireCopyButtons(box);
}

function renderEmergency(a) {
  const bar = $('emergency');
  if (!bar) return;
  if (a.emergency) {
    $('emergencyList').innerHTML = EMERGENCY_US
      .map(r => `<a href="${r.href}">${esc(r.label)}</a>`).join('');
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

/* Copy buttons rendered anywhere (home demo drafts, reply drafts). */
function wireCopyButtons(root) {
  (root || document).querySelectorAll('[data-copy]').forEach(b => {
    if (b.dataset.copyWired) return;
    b.dataset.copyWired = '1';
    b.addEventListener('click', async () => {
      const ok = await copyText(b.dataset.copy);
      const orig = b.textContent;
      b.textContent = ok ? 'Copied ✓' : 'Copy failed — long-press to copy';
      setTimeout(() => { b.textContent = orig; }, 1600);
    });
  });
}

/* ---------------- evidence file (this browser only) ---------------- */
function loadEvidence() {
  try { return JSON.parse(localStorage.getItem(EVIDENCE_KEY) || '[]'); }
  catch (e) { return []; }
}
function storeEvidence(list) {
  try { localStorage.setItem(EVIDENCE_KEY, JSON.stringify(list)); }
  catch (e) { /* storage full/blocked */ }
}

function evidenceText(list) {
  const lines = [
    'V.I.K.e — Personal incident log',
    '================================',
    'This is a personal contemporaneous log. It is NOT forensic chain-of-custody',
    'and makes no legal claims. Generated from this browser only.',
    ''
  ];
  list.slice().reverse().forEach((e, i) => {
    lines.push(`--- Entry ${i + 1} — ${new Date(e.ts).toLocaleString()} ---`);
    lines.push(`Assessment: ${e.severityLabel} (confidence ${e.severityConfidence}/100${e.demoMode ? ', DEMO analysis' : ''})`);
    lines.push(`Recommended posture: ${e.recommendedPosture}`);
    if (e.cueLabels && e.cueLabels.length) lines.push(`Flags: ${e.cueLabels.join('; ')}`);
    lines.push(`Excerpt: ${e.excerpt}`);
    lines.push('');
  });
  return lines.join('\n');
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function wireEvidence() {
  if (!$('saveEvidenceBtn')) return;
  $('saveEvidenceBtn').addEventListener('click', () => {
    const a = state.lastAnalysis;
    if (!a) { alert('Screen a message first — then save it here.'); return; }
    const list = loadEvidence();
    list.unshift({
      ts: new Date().toISOString(),
      severity: a.severity,
      severityLabel: a.severityLabel,
      severityConfidence: a.severityConfidence,
      excerpt: state.lastInput.slice(0, 220),
      cueLabels: (a.cues || []).map(c => c.label || c.type),
      recommendedPosture: a.recommendedPostureLabel || a.recommendedPosture,
      provider: a.provider, demoMode: !!a.demoMode
    });
    storeEvidence(list);
    renderEvidenceList();
  });

  $('exportBtn').addEventListener('click', () => {
    const list = loadEvidence();
    if (!list.length) { alert('Nothing to export yet.'); return; }
    download(`vike-incident-log-${new Date().toISOString().slice(0, 10)}.txt`,
      evidenceText(list), 'text/plain');
    if (window.trackEvent) window.trackEvent('export');
  });

  $('exportJsonBtn').addEventListener('click', () => {
    const list = loadEvidence();
    if (!list.length) { alert('Nothing to export yet.'); return; }
    download(`vike-incident-log-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exported: new Date().toISOString(), entries: list }, null, 2),
      'application/json');
    if (window.trackEvent) window.trackEvent('export');
  });

  $('clearEvidenceBtn').addEventListener('click', () => {
    if (!loadEvidence().length) return;
    if (confirm('Delete the entire evidence file from this device? This cannot be undone.')) {
      storeEvidence([]);
      renderEvidenceList();
      if (window.trackEvent) window.trackEvent('delete_all');
    }
  });

  $('evidenceList').addEventListener('click', (e) => {
    const id = e.target && e.target.dataset && e.target.dataset.del;
    if (id === undefined) return;
    const list = loadEvidence();
    list.splice(Number(id), 1);
    storeEvidence(list);
    renderEvidenceList();
  });
}

function renderEvidenceList() {
  const box = $('evidenceList');
  if (!box) return;
  const list = loadEvidence();
  if (!list.length) {
    box.innerHTML = '<p class="empty">No entries yet. Screen something, then save it here.</p>';
    return;
  }
  box.innerHTML = list.map((e, i) => `
    <div class="eitem">
      <div class="emeta"><span>${esc(new Date(e.ts).toLocaleString())}</span><span>${esc(e.severityLabel || '')}</span></div>
      <p class="ex">${esc(e.excerpt)}${e.excerpt && e.excerpt.length >= 220 ? '…' : ''}</p>
      <button class="edel btn-ghost" data-del="${i}">Delete entry</button>
    </div>`).join('');
}

/* ---------------- founding circle is OFF: request an invite ----------------
 * Per the build brief: no live charges until the Stripe webhook is set up
 * and one real test charge + refund passes. Until then, "Request an invite."
 * The live founding-circle payment link on vike-v1-restore is untouched.
 * ---------------------------------------------------------------------- */
function wireWaitlist() {
  const form = $('waitlistForm');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const status = $('waitlistStatus');
    const btn = $('waitlistBtn');
    const name = $('wlName').value.trim().slice(0, 120);
    const email = $('wlEmail').value.trim().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Enter a valid email so we can reach you.';
      $('wlEmail').focus();
      return;
    }
    btn.disabled = true;
    status.textContent = 'Saving your request…';
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        status.textContent = 'You\u2019re on the list. We\u2019ll write when your seat is ready — no charge today, no card asked.';
        $('wlName').value = ''; $('wlEmail').value = '';
        if (window.trackEvent) window.trackEvent('waitlist_join');
      } else {
        status.textContent = (data && data.error) || 'Could not save — try again.';
      }
    } catch (e) {
      status.textContent = 'Could not reach the server — try again.';
    }
    btn.disabled = false;
  });
}

/* ---------------- "home safe?" check-in: pre-written text, she taps send ---------------- */
function wireCheckin() {
  const btn = $('checkinBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const status = $('checkinStatus');
    const name = $('checkinName').value.trim();
    const phone = $('checkinPhone').value.replace(/[^\d+]/g, '');
    if (!phone) {
      status.textContent = 'Add her number first — the message opens in your messaging app.';
      $('checkinPhone').focus();
      return;
    }
    const text = 'Hey' + (name ? ' ' + name : '') +
      ' — date plan for Thursday: my own car, parked where I can leave on my own. ' +
      'I\u2019ll text you "home safe" by 11pm. If you don\u2019t hear from me by 11:30, call me.';
    window.location.href = 'sms:' + encodeURIComponent(phone) +
      (navigator.userAgent.match(/iPhone|iPad|iPod/) ? '&' : '?') +
      'body=' + encodeURIComponent(text);
    status.textContent = 'Your messaging app should open with the plan pre-written. Nothing sends until you tap send.';
  });
}

/* ---------------- nominations ---------------- */
function wireNominate() {
  const btn = $('nominateBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const status = $('nominateStatus');
    const yourName = $('nomYourName').value.trim();
    const herName = $('nomHerName').value.trim();
    const herContact = $('nomHerContact').value.trim();
    const why = $('nomWhy').value.trim();
    if (!yourName || !herName) {
      status.textContent = 'Your name and her name are required.';
      return;
    }
    btn.disabled = true;
    status.textContent = 'Nominating…';
    try {
      const res = await fetch('/api/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourName, herName, herContact, why })
      });
      const data = await res.json();
      if (data.ok) {
        status.textContent = 'She\u2019s nominated. A place in the circle is held for her.';
        $('nomYourName').value = ''; $('nomHerName').value = '';
        $('nomHerContact').value = ''; $('nomWhy').value = '';
      } else {
        status.textContent = data.error || 'Something went wrong — try again.';
      }
    } catch (e) {
      status.textContent = 'Could not reach the server — try again.';
    }
    btn.disabled = false;
  });
}
