'use strict';
/* =====================================================================
 * V.I.K.e V1 — MOCK provider (demo mode)
 * ---------------------------------------------------------------------
 * Deterministic, pattern-based analysis. THIS IS NOT AI.
 *
 * Purpose: the app runs end-to-end with zero API keys and zero cost, so
 * Sean can demo, gather feedback, and validate before spending a dollar.
 * It is CLEARLY LABELED as a demo in the API response, the UI badge,
 * and the README. Confidence scores are capped — heuristics are not
 * judgment.
 *
 * When LLM_PROVIDER=openai (with a key), providers/index.js bypasses
 * this file entirely and the real provider takes over.
 * =================================================================== */
const {
  SEVERITY_ORDER, SEVERITY_LABELS, SEVERITY_DESCRIPTIONS,
  CUE_DEFS, POSTURES
} = require('../analysis/rubric');

const PROVIDER_ID = 'mock-demo';
const DISCLAIMER =
  'DEMO ANALYSIS — pattern-based heuristics, not AI. ' +
  'Useful for trying the workflow; not a substitute for judgment. ' +
  'Add an LLM API key (see README) for real AI analysis.';

/* [severity 1..4, cueType, regex, analyst note] */
const PATTERNS = [
  // ---- imminent danger (4) ----
  [4, 'coercion-threat', /\b(i'?ll|i will|gonna|going to)\s+(kill|murder|hurt|stab|shoot|strangle|choke|beat)\s+(you|u)\b/i, 'Explicit threat of physical violence'],
  [4, 'coercion-threat', /\b(knife|gun|pistol|rifle|weapon)\b.{0,40}\b(you|your)\b/i, 'Weapon mentioned in a threatening context'],
  [4, 'coercion-threat', /\byou'?re dead\b|\byou are dead\b/i, '"You\'re dead" — direct death threat'],
  [4, 'coercion-threat', /\bi know where you live\b/i, 'Claims knowledge of your location'],
  [4, 'coercion-threat', /\bwatch your back\b/i, '"Watch your back" — implied physical threat'],
  [4, 'coercion-threat', /\bcoming (to|for) (you|your (place|house|home|work|apartment))\b/i, 'Threatening to come to you in person'],
  // ---- threatening (3) ----
  [3, 'coercion-threat', /\byou'?ll (regret|be sorry)\b/i, '"You\'ll regret this" — threatened retaliation'],
  [3, 'coercion-threat', /\b(i'?ll|i will)\s+(ruin|destroy)\s+you\b/i, 'Threat to ruin or destroy you'],
  [3, 'coercion-threat', /\b(post|send|show|leak)\s+(it|them|those|the (pics|photos|videos|messages))\b/i, 'Threatened exposure — possible image-based abuse'],
  [3, 'coercion-threat', /\b(?<!don't )(?<!do not )tell (everyone|anyone|your (boss|family|mom|mother|dad|friends))\b/i, 'Threat to tell others about you'],
  [3, 'coercion-threat', /\bif you (tell|leave|don'?t)\b.{0,40}\b(i'?ll|i will)\b/i, 'Conditional threat ("if you… then I\'ll…")'],
  [3, 'coercion-threat', /\brevenge\b/i, 'Revenge language'],
  [3, 'coercion-threat', /\bdo what i say\b/i, 'Direct command for obedience'],
  // ---- harassment (2) ----
  [2, 'degradation', /\b(bitch|slut|whore|cunt)\b/i, 'Degrading slur'],
  [2, 'degradation', /\b(worthless|pathetic|disgusting)\b/i, 'Language aimed at your self-worth'],
  [2, 'degradation', /\bnobody (wants|loves|cares about|will ever)\b.{0,20}\byou\b/i, 'Isolation framing — "nobody will want you"'],
  [2, 'gaslighting', /\byou'?re (crazy|insane|paranoid|delusional)\b/i, 'Labels your perception as disordered'],
  [2, 'gaslighting', /\byou'?re imagining (things|it)\b/i, 'Denies your experience as imagined'],
  [2, 'gaslighting', /\bthat never happened\b/i, 'Denies an event outright'],
  [2, 'gaslighting', /\bi never said that\b/i, 'Denies their own prior statement'],
  [2, 'gaslighting', /\byou'?re (too sensitive|overreacting|over-reacting)\b/i, 'Frames your reaction as the problem'],
  [2, 'gaslighting', /\byou'?re remembering (it )?wrong\b/i, 'Rewrites your memory of events'],
  [2, 'darvo-reversal', /\byou'?re the (abusive|toxic|crazy|manipulative) one\b/i, 'Role reversal — you raise a concern, you become the accused'],
  [2, 'darvo-reversal', /\blook what you made me do\b/i, 'Blames you for their behavior'],
  [2, 'darvo-reversal', /\bthis is (all )?your fault\b/i, 'Total blame-shift'],
  [2, 'guilt-tripping', /\bafter (everything|all) i'?ve done\b/i, 'Leverages past favors as a debt'],
  [2, 'guilt-tripping', /\byou owe me\b/i, 'Frames the relationship as something you owe'],
  [2, 'triangulation', /\beveryone (agrees|thinks|knows|says)\b/i, 'Recruits an imaginary consensus against you'],
  [2, 'triangulation', /\bmy ex (never|didn'?t|wouldn'?t)\b/i, 'Compares you unfavorably to an ex'],
  [2, 'triangulation', /\beven your (mom|mother|dad|father|friends|sister)\b.{0,30}\b(agrees|thinks|says)\b/i, 'Uses people close to you as leverage'],
  [2, 'pressure', /\banswer me\b/i, 'Demands an immediate response'],
  [2, 'pressure', /\b(pick up|pickup) (the phone|your phone)\b|\bwhy aren'?t you (answering|responding|picking up)\b/i, 'Pursuit after non-response'],
  [2, 'pressure', /\bif you (really )?loved me\b/i, 'Affection made conditional on compliance'],
  [2, 'pressure', /\byou (never|don'?t) listen\b/i, 'Compliance framing — obedience cast as "listening"'],
  // ---- nuisance (1): manipulation patterns that are lower-grade alone ----
  [1, 'love-bombing', /\b(never|haven'?t) felt this way\b|\bsoulmate\b|\bmeant to be\b/i, 'Intense premature intimacy language'],
  [1, 'love-bombing', /\bcan'?t live without you\b/i, 'Dependency framed as devotion'],
  [1, 'love-bombing', /\byou'?re (so )?(perfect|amazing|incredible).{0,40}\b(never|no one)\b/i, 'Idealization — pedestal language'],
  [1, 'hoovering', /\bi'?ve changed\b/i, 'Claims transformation — verify against behavior, not words'],
  [1, 'hoovering', /\bjust (give|hear) me (one|another) (more )?chance\b/i, 'Requests re-entry after a boundary was set'],
  [1, 'hoovering', /\bi'?m (a )?different (man|person|woman)\b/i, 'Reinvention claim without evidence'],
  [1, 'guilt-tripping', /\bi did (so much|everything) for you\b/i, 'Sacrifice ledger — generosity converted to leverage'],
  /* ---- dating-screening lens: the "anti-Rizz" patterns ----
   * Engine stays generic (fires on any text); tuned for match screening. */
  [2, 'future-faking', /\bwhen we (move in|get married|travel|have kids|meet (your|my) (parents|family))\b/i, 'Detailed shared-future plans, very early'],
  [2, 'future-faking', /\bi can (already )?see us\b/i, '"I can see us…" — premature destiny framing'],
  [1, 'future-faking', /\bour (future|life together|wedding|kids)\b/i, 'Claims a shared future as established fact'],
  [2, 'future-faking', /\bwe'?re (going to|gonna) be (so happy|great together|perfect)\b/i, 'Guaranteed-happiness promises before trust exists'],
  [3, 'romance-scam', /\b(gift ?cards?|bitcoin|crypto|wire transfer)\b/i, 'Untraceable payment method — hallmark of fraud'],
  [3, 'romance-scam', /\bsend me (\$|money)\b|\bneed (\$[\d,]+|money)\b/i, 'Direct request for money'],
  [3, 'romance-scam', /\b(bank )?account (is |was )?(frozen|locked|blocked)\b/i, '"Frozen account" — the classic setup line'],
  [2, 'romance-scam', /\bcan'?t (video chat|do video|video call|meet in person|meet up)\b/i, 'Refuses verifiable contact'],
  [2, 'romance-scam', /\b(oil rig|deployed overseas|stationed abroad)\b/i, 'Unverifiable distant posting — common scam backstory'],
  [2, 'romance-scam', /\bemergency\b.{0,40}\b(money|help|send)\b/i, 'Manufactured emergency requiring funds'],
  [1, 'off-app-pressure', /\b(whatsapp|telegram|signal|snapchat|\bsnap\b|kik)\b/i, 'Names an off-app channel'],
  [2, 'off-app-pressure', /\bmove (this|it|our chat) (to|off)\b|\bget off (this app|here|tinder|hinge|bumble)\b/i, 'Explicit push to leave the platform'],
  [1, 'off-app-pressure', /\b(give me|what'?s|what is) your number\b/i, 'Requests your phone number'],
  [1, 'off-app-pressure', /\bi hate (this app|typing here|chatting here)\b/i, '"Hate this app" — the standard pretext for moving off-platform'],
  [2, 'negging', /\b(pretty|beautiful|smart|funny|cool) for (your age|a girl|a woman)\b/i, 'Compliment with a qualifier — the dent is the point'],
  [2, 'negging', /\bmost (girls|women|guys)\b.{0,25}\bwouldn'?t\b/i, 'Comparative put-down against "most" people'],
  [2, 'negging', /\bno offense,? but\b/i, '"No offense, but" — offense incoming'],
  [1, 'breadcrumbing', /\bhey stranger\b/i, '"Hey stranger" — re-entry with zero accountability'],
  [1, 'breadcrumbing', /\bjust (checking in|thinking of you|wanted to say hi)\b/i, 'Low-effort check-in designed to keep the thread alive'],
  [2, 'inconsistency', /\bwait,? i meant\b|\bno,? i meant\b|\bsorry,? (i meant|that was supposed to say)\b/i, 'Self-correction of a stated fact — note what changed'],
  [2, 'inconsistency', /\bto be honest\b.{0,50}\bactually\b/i, '"To be honest… actually…" — the second version replaces the first']
];

/* Single-message contradiction heuristics: [regexA, regexB|null, description] */
const CONTRADICTIONS = [
  [/i'?m sorry/i, /but you/i,
    'Apology paired with blame-shift ("I\'m sorry, but you…") — the reversal cancels the apology.'],
  [/\blove you\b/i, /\b(bitch|stupid|hate you|worthless|shut up)\b/i,
    'Affection and contempt in the same message — incompatible signals. Believe the contempt.'],
  [/leave you alone/i, /just (answer|call|text|pick up|respond)/i,
    'Claims to back off while still demanding contact — the boundary is theater.'],
  [/\blast (time|message|text)\b/i, null,
    'Declares "last contact." Check your history: how many "last times" have there been?'],
  [/i'?ll change/i, /you (always|never)\b/i,
    'Promises their own change while issuing absolute accusations at you.'],
  [/trust me/i, /don'?t tell (anyone|soul)\b/i,
    '"Trust me" paired with demanded secrecy — secrecy protects them, not you.'],
  [/respect your (decision|space|wishes|boundaries)/i, /but.{0,60}(call|text|see|talk)/i,
    'Claims to respect your boundary, then immediately negotiates past it.']
];

function excerpt(text, re) {
  const m = text.match(re);
  if (!m || m.index === undefined) return '';
  const start = Math.max(0, m.index - 24);
  const end = Math.min(text.length, m.index + m[0].length + 24);
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '…' + s;
  if (end < text.length) s = s + '…';
  return `“${s}”`;
}

function buildDrafts(severity) {
  const drafts = [
    {
      posture: 'firm-boundary',
      text: 'Do not contact me again. I am documenting every message.',
      rationale: 'One clear line, stated once. Boundaries are declared, then enforced by silence — never debated.'
    },
    {
      posture: 'gray-rock',
      text: 'Noted.',
      rationale: 'Boring is armor. No emotion, no argument, nothing to grip. Use when any reply risks feeding the cycle.'
    },
    {
      posture: 'warm-closed',
      text: 'I need space right now, and I\'m asking you to respect that. Please don\'t contact me for the next 30 days.',
      rationale: 'Warmth with the door closed. Only use this if you genuinely want the door ajar later — otherwise choose silence.'
    }
  ];
  if (severity >= 3) {
    drafts[0].text = 'Do not contact me again. Any further contact will be documented and reported.';
    drafts[0].rationale = 'At this level the boundary carries a consequence. State it once, in writing, then disengage completely.';
  }
  return drafts;
}

function recommendPosture(severity, cueTypes) {
  const scam = cueTypes.has('romance-scam');
  const scamTail = scam
    ? ' Do not send money, gift cards, or crypto — no exceptions, no "small favor". Report and block the profile on the dating app.'
    : '';
  if (severity >= 4) {
    return {
      posture: 'silence',
      rationale: 'Someone threatening physical harm does not get engagement — any reply tells them you\'re reachable and rattled. ' +
        'Say nothing. Preserve everything. Tell someone you trust, and contact authorities if you feel unsafe. ' +
        'V.I.K.e cannot intervene; reach a human who can.' + scamTail
    };
  }
  if (severity === 3) {
    return {
      posture: 'silence',
      rationale: 'Threats and coercion feed on engagement. Even a firm reply teaches them which buttons work. ' +
        'Silence starves the tactic. Document everything instead of debating it.' + scamTail
    };
  }
  if (cueTypes.has('gaslighting') || cueTypes.has('darvo-reversal')) {
    return {
      posture: 'gray-rock',
      rationale: 'You cannot win a reality debate with someone rewriting reality — engagement IS the trap. ' +
        'Gray-rock denies them the emotional reaction the tactic needs. If pressure escalates, switch to full silence.'
    };
  }
  if (severity === 2) {
    return {
      posture: 'firm-boundary',
      rationale: 'Name the line once, plainly. Then hold it with silence — restating a boundary is negotiating it.'
    };
  }
  return {
    posture: 'warm-closed',
    rationale: 'Low-grade contact. A warm, closed reply keeps your dignity intact without opening a negotiation.'
  };
}

async function analyze({ text }) {
  const t = String(text || '');
  const hits = [];
  for (const [sev, cue, re, note] of PATTERNS) {
    if (re.test(t)) {
      hits.push({ sev, cue, note, evidence: excerpt(t, re) });
    }
  }

  // Volume heuristic: rapid-fire contact demands in one paste suggest pursuit.
  const contactDemands = (t.match(/\b(call|text|answer|respond|pick up)\b/gi) || []).length;
  if (contactDemands >= 4 && !hits.some(h => h.cue === 'pressure')) {
    hits.push({ sev: 2, cue: 'pressure', note: 'Repeated contact demands in a single burst — pursuit pattern', evidence: '' });
  }

  // ---- composite signals: patterns that mean more together ----
  // Sean authorized full-strength heuristics — these multi-signal
  // composites are the "no holding back" layer of the demo engine.
  const cueSet0 = new Set(hits.map(h => h.cue));
  // Romance-scam sequence: off-app move + fraud markers = the classic play.
  if (cueSet0.has('off-app-pressure') && cueSet0.has('romance-scam')) {
    hits.push({ sev: 3, cue: 'romance-scam', note: 'Scam composite: off-app move combined with fraud markers — the classic romance-scam sequence', evidence: '' });
  }
  // Intimacy at speed: love-bombing + future-faking.
  if (cueSet0.has('love-bombing') && cueSet0.has('future-faking')) {
    hits.push({ sev: 2, cue: 'future-faking', note: 'Composite: love-bombing + future-faking — intimacy being manufactured at speed', evidence: '' });
  }
  // Soft-scam probe: money-adjacent language without a direct ask yet.
  if (cueSet0.has('romance-scam') && /\b(money|financial|bills|debt)\b/i.test(t) && !cueSet0.has('off-app-pressure')) {
    hits.push({ sev: 2, cue: 'romance-scam', note: 'Money talk without a direct ask yet — watch for the request; it usually follows', evidence: '' });
  }

  let sevNum = 1;
  for (const h of hits) if (h.sev > sevNum) sevNum = h.sev;
  const severity = SEVERITY_ORDER[sevNum - 1];
  const cueTypes = new Set(hits.map(h => h.cue));

  const contradictions = [];
  for (const [reA, reB, description] of CONTRADICTIONS) {
    if (reA.test(t) && (!reB || reB.test(t))) {
      contradictions.push({ description, confidence: 62 });
    }
  }

  const distinctCues = cueTypes.size;
  // Capped: heuristics are not judgment. Never above 80 in demo mode.
  const severityConfidence = Math.min(80, 50 + hits.length * 6 + distinctCues * 4);

  const cues = hits.map(h => ({
    type: h.cue,
    label: (CUE_DEFS[h.cue] || {}).label || h.cue,
    evidence: h.evidence,
    note: h.note,
    confidence: Math.min(78, 55 + (h.sev >= 3 ? 12 : 4))
  }));

  const rec = recommendPosture(sevNum, cueTypes);
  const drafts = buildDrafts(sevNum);

  return {
    provider: PROVIDER_ID,
    demoMode: true,
    severity,
    severityLabel: SEVERITY_LABELS[severity],
    severityDescription: SEVERITY_DESCRIPTIONS[severity],
    severityConfidence,
    confidenceNote: 'Heuristic estimate from pattern matching (demo mode) — not a measured probability.',
    cues,
    contradictions,
    recommendedPosture: rec.posture,
    recommendedPostureLabel: POSTURES[rec.posture],
    postureRationale: rec.rationale,
    drafts: drafts.map(d => ({ ...d, label: POSTURES[d.posture] })),
    silenceRationale: rec.posture === 'silence'
      ? rec.rationale
      : 'Silence is always an option. If any reply feels like it would reward the behavior — or cost you peace — say nothing. Silence is a complete sentence.',
    emergency: sevNum >= 4,
    disclaimer: DISCLAIMER
  };
}

module.exports = { analyze, PROVIDER_ID };
