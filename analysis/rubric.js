'use strict';
/* =====================================================================
 * V.I.K.e V1 — shared analysis taxonomy.
 *
 * Used by the mock provider AND injected into the real-LLM system prompt,
 * so both providers classify the same way and return the same shape.
 * Edit the language here and both providers follow.
 * =================================================================== */

const SEVERITY_ORDER = ['nuisance', 'harassment', 'threatening', 'imminent-danger'];

const SEVERITY_LABELS = {
  'nuisance': 'Nuisance',
  'harassment': 'Harassment',
  'threatening': 'Threatening',
  'imminent-danger': 'Imminent danger'
};

const SEVERITY_DESCRIPTIONS = {
  'nuisance':
    'Unwanted but low-grade contact. Annoying, not alarming.',
  'harassment':
    'Repeated unwanted contact, insults, or pressure that demeans, exhausts, or wears you down.',
  'threatening':
    'Threats of harm — reputational, social, financial, or implied physical. Coercive by design.',
  'imminent-danger':
    'Explicit or strongly implied threat of physical harm, weapons, or claimed knowledge of your location. Treat as urgent.'
};

const CUE_DEFS = {
  'gaslighting': {
    label: 'Gaslighting',
    description: 'Denies your reality — your memory, perception, or feelings are framed as wrong, disordered, or "too much".'
  },
  'love-bombing': {
    label: 'Love-bombing',
    description: 'Overwhelming affection, flattery, or premature intimacy used to accelerate attachment before trust is earned.'
  },
  'darvo-reversal': {
    label: 'Blame reversal (DARVO-style)',
    description: 'Deny, attack, reverse victim and offender: you raise a concern, and suddenly you are the one on trial.'
  },
  'guilt-tripping': {
    label: 'Guilt-tripping',
    description: 'Past favors or sacrifices are leveraged as a debt you must repay with compliance.'
  },
  'hoovering': {
    label: 'Hoovering',
    description: 'Sucks you back in after a boundary — sudden transformation claims, nostalgia, or a manufactured crisis.'
  },
  'triangulation': {
    label: 'Triangulation',
    description: 'A third party, real or invented, is recruited to pressure you, judge you, or make you compete.'
  },
  'coercion-threat': {
    label: 'Coercion / threat',
    description: 'Compliance extracted through fear — threats of exposure, retaliation, or physical harm.'
  },
  'degradation': {
    label: 'Degradation',
    description: 'Insults and slurs aimed at your worth, designed to shrink you and keep you off balance.'
  },
  'pressure': {
    label: 'Pressure / control',
    description: 'Demands for immediate response, monitoring language, or affection made conditional on obedience.'
  },
  /* ---- dating-screening lens (the "anti-Rizz" use case) ----
   * The engine stays generic — these fire on any pasted text — but the
   * taxonomy is tuned for dating-conversation screening. */
  'future-faking': {
    label: 'Future-faking',
    description: 'Lavish promises of a shared future — trips, moving in, marriage — deployed early to manufacture commitment before trust exists.'
  },
  'romance-scam': {
    label: 'Romance-scam markers',
    description: 'Classic fraud signals: money or gift-card requests, frozen accounts, tragic emergencies needing funds, refusal to verify identity, too-perfect distant backstory.'
  },
  'off-app-pressure': {
    label: 'Off-app pressure',
    description: 'Push to leave the dating app fast (WhatsApp, text, Snap) — often the step before scams or harassment, because it removes the platform\u2019s guardrails.'
  },
  'inconsistency': {
    label: 'Story inconsistency',
    description: 'Details that shift — age, job, location, availability. One slip is human; a pattern is a fabrication tell. Cross-message history makes this stronger.'
  },
  'negging': {
    label: 'Negging',
    description: 'Backhanded compliments and comparative put-downs ("pretty for your age") designed to dent confidence and manufacture a need for approval.'
  },
  'breadcrumbing': {
    label: 'Breadcrumbing',
    description: 'Sporadic low-effort contact ("hey stranger") that keeps you hooked without real investment. Attention used as a leash.'
  }
};

const POSTURES = {
  'firm-boundary': 'Firm boundary',
  'gray-rock': 'Gray rock (minimal)',
  'warm-closed': 'Warm but closed',
  'silence': 'Say nothing'
};

/* US emergency resources shown whenever severity is imminent-danger.
 * V.I.K.e never intervenes — she points to humans who can. */
const EMERGENCY_US = [
  { label: 'Emergency', detail: 'Call 911', href: 'tel:911' },
  { label: 'National Domestic Violence Hotline', detail: '1-800-799-7233', href: 'tel:18007997233' },
  { label: 'Crisis Text Line', detail: 'Text HOME to 741741', href: 'sms:741741' }
];

const EMERGENCY_NOTE =
  'V.I.K.e is software. She cannot call anyone, cannot intervene, and is not ' +
  'a substitute for professional help. If you feel unsafe, reach a human now — ' +
  'a trusted person, local authorities, or one of the resources above.';

/* The exact JSON contract every provider must return. The real-LLM prompt
 * instructs the model to produce precisely this shape. */
const ANALYSIS_CONTRACT = `{
  "severity": "nuisance | harassment | threatening | imminent-danger",
  "severityConfidence": 0-100,
  "cues": [ { "type": "<cue id>", "evidence": "<short quoted excerpt>", "note": "<why it matters>", "confidence": 0-100 } ],
  "contradictions": [ { "description": "<what contradicts what>", "confidence": 0-100 } ],
  "recommendedPosture": "firm-boundary | gray-rock | warm-closed | silence",
  "postureRationale": "<2-3 sentences: why this posture, what it protects>",
  "drafts": [
    { "posture": "firm-boundary", "text": "<reply draft>", "rationale": "<why this works>" },
    { "posture": "gray-rock", "text": "<reply draft>", "rationale": "<why this works>" },
    { "posture": "warm-closed", "text": "<reply draft>", "rationale": "<why this works>" }
  ],
  "silenceRationale": "<when saying nothing is the move and why>"
}`;

module.exports = {
  SEVERITY_ORDER,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
  CUE_DEFS,
  POSTURES,
  EMERGENCY_US,
  EMERGENCY_NOTE,
  ANALYSIS_CONTRACT
};
