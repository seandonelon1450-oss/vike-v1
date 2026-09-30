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
  wireSummon();
  wireSamples();
  wireCircle();
  wireDictate();
  wireAnalyze();
  wireEvidence();
  wireFounding();
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

/* ---------------- tabs ---------------- */
function wireTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.screen === id));
  window.scrollTo({ top: 0 });
}

/* ---------------- summon: "Hey Vicky" ---------------- */
function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 0.9;
    // Prefer a mature female voice when the platform offers a choice.
    const vs = window.speechSynthesis.getVoices();
    const pick = vs.find(v => /female/i.test(v.name) && /en/i.test(v.lang))
      || vs.find(v => /en/i.test(v.lang));
    if (pick) u.voice = pick;
    window.speechSynthesis.speak(u);
  } catch (e) { /* silent — speech is garnish, not core */ }
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

function wireSummon() {
  const btn = $('summonBtn'), face = $('guardianFace'), hint = $('summonHint');
  btn.addEventListener('click', () => {
    face.classList.add('wake');
    hint.textContent = 'She heard you.';
    speak("I'm here. What happened?");
    // Where supported, listen for the reply and drop it into the input.
    tryListenOnce();
    setTimeout(() => {
      face.classList.remove('wake');
      showScreen('screen-analyze');
      $('incidentInput').focus({ preventScroll: false });
    }, 1400);
  });
}

/* One-shot speech recognition (Chrome/desktop/Android). iPhone Safari
 * doesn't expose it — the tap fallback above always works. */
function tryListenOnce() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  try {
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const box = $('incidentInput');
      box.value = (box.value ? box.value + '\n' : '') + t;
    };
    rec.onerror = () => {};
    rec.start();
    setTimeout(() => { try { rec.stop(); } catch (e) {} }, 12000);
  } catch (e) {}
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
        $('analyzeStatus').textContent = 'Sample loaded (fictional demo data). Press Analyze below \u2014 see what I make of it.';
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

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  return 'I\'m inviting you to V.I.K.e — my personal safety copilot for the dating world. ' +
    'Open ' + location.origin + ', tap Circle, and enter my invite code: ' + code + '. ' +
    'This is private — only for people I trust.';
}

function renderCircle() {
  const d = loadInvites();
  if (!d.myCode) { d.myCode = newInviteCode(); saveInvites(d); }
  $('myInviteCode').textContent = d.myCode;

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
  $('analyzeBtn').addEventListener('click', async () => {
    const text = $('incidentInput').value.trim();
    const status = $('analyzeStatus'), out = $('results');
    if (!text) { status.textContent = 'Paste or dictate the message first.'; return; }
    $('analyzeBtn').disabled = true;
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
      status.textContent = '';
    } catch (e) {
      status.textContent = 'Something went wrong: ' + e.message;
    } finally {
      $('analyzeBtn').disabled = false;
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

  $('results').innerHTML = `
    <div class="sev-card sev-${esc(a.severity)}">
      <p class="sev-label">${esc(a.severityLabel || a.severity)}</p>
      <p class="sev-desc">${esc(a.severityDescription || '')}</p>
      <div class="meter" aria-hidden="true">${meter}</div>
      <p class="conf">Confidence: ${esc(a.severityConfidence)}/100 — ${esc(a.confidenceNote || '')}</p>
    </div>
    ${cues ? `<h2>What she sees</h2>${cues}` : '<p class="hint">No classic manipulation patterns flagged in this text. That doesn\u2019t mean it felt fine — trust your gut too.</p>'}
    ${contras ? `<h2>Contradictions</h2>${contras}` : ''}
    <div class="card">
      <strong>Her recommendation: ${esc(a.recommendedPostureLabel || a.recommendedPosture)}</strong>
      <p>${esc(a.postureRationale || '')}</p>
    </div>
    <p class="disclaimer">${esc(a.disclaimer || '')}</p>`;
}

function renderDrafts(a) {
  const box = $('drafts');
  const rec = a.recommendedPosture;
  const cards = (a.drafts || []).map(d => `
    <div class="draft ${d.posture === rec ? 'rec' : ''}">
      <div class="posture">${esc(d.label || d.posture)}</div>
      <blockquote>${esc(d.text)}</blockquote>
      <p class="why">${esc(d.rationale || '')}</p>
      <button data-copy="${esc(d.text)}">Copy draft</button>
    </div>`).join('');
  const silence = `
    <div class="draft ${rec === 'silence' ? 'rec' : ''}">
      <div class="posture">Say nothing</div>
      <blockquote>(Say nothing.)</blockquote>
      <p class="why">${esc(a.silenceRationale || '')}</p>
    </div>`;
  box.innerHTML = cards + silence + `<p class="disclaimer">${esc(a.disclaimer || '')}</p>`;
  box.querySelectorAll('[data-copy]').forEach(b =>
    b.addEventListener('click', () => copyText(b.dataset.copy, b)));
}

function renderEmergency(a) {
  const bar = $('emergency');
  if (a.emergency) {
    $('emergencyList').innerHTML = EMERGENCY_US
      .map(r => `<a href="${r.href}">${esc(r.label)}</a>`).join('');
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

async function copyText(text, btn) {
  const done = () => { const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = o, 1500); };
  try {
    await navigator.clipboard.writeText(text);
    done();
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e2) {}
    document.body.removeChild(ta);
  }
}

/* ---------------- evidence file (this browser only) ---------------- */
function loadEvidence() {
  try { return JSON.parse(localStorage.getItem(EVIDENCE_KEY) || '[]'); }
  catch (e) { return []; }
}
function storeEvidence(list) {
  localStorage.setItem(EVIDENCE_KEY, JSON.stringify(list));
}

function wireEvidence() {
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
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vike-incident-log-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  $('clearEvidenceBtn').addEventListener('click', () => {
    if (!loadEvidence().length) return;
    if (confirm('Delete the entire evidence file from this device? This cannot be undone.')) {
      storeEvidence([]);
      renderEvidenceList();
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
  const list = loadEvidence();
  if (!list.length) {
    box.innerHTML = '<p class="empty">No entries yet. Screen something, then save it here.</p>';
    return;
  }
  box.innerHTML = list.map((e, i) => `
    <div class="eitem">
      <div class="emeta"><span>${esc(new Date(e.ts).toLocaleString())}</span><span>${esc(e.severityLabel || '')}</span></div>
      <p class="ex">${esc(e.excerpt)}${e.excerpt && e.excerpt.length >= 220 ? '…' : ''}</p>
      <button class="edel ghost" data-del="${i}">Delete entry</button>
    </div>`).join('');
}

/* ---------------- founding circle (Stripe Checkout) ---------------- */
function wireFounding() {
  $('foundingBtn').addEventListener('click', async () => {
    const note = $('foundingNote');
    note.textContent = 'Opening secure checkout\u2026';
    try {
      await window.VikeBilling.startCheckout('founding');
    } catch (e) {
      note.textContent = e.message || 'Checkout failed. Try again.';
    }
  });
}
