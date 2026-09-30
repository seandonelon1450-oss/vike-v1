'use strict';
/* =====================================================================
 * V.I.K.e V1 — REAL provider (OpenAI-compatible API).
 *
 * Activated when LLM_PROVIDER=openai and LLM_API_KEY is set.
 * Works with OpenAI or any OpenAI-compatible endpoint
 * (override LLM_BASE_URL). The key stays server-side — it is never
 * sent to the browser.
 *
 * At founding-circle scale (a few dozen users, occasional analyses),
 * a small model (default gpt-4o-mini class) costs single dollars/month.
 * See README "API costs".
 * =================================================================== */
const { buildSystemPrompt } = require('../analysis/prompt');
const { POSTURES } = require('../analysis/rubric');

const PROVIDER_ID = 'openai';
const TIMEOUT_MS = 45000;

function config() {
  return {
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  };
}

function isConfigured() {
  return config().apiKey.length > 0;
}

/* Validate + normalize the model's JSON into our contract. Throws on
 * unrecoverable shape problems so the API route can 502 honestly. */
function normalize(raw, fallbackText) {
  let data = raw;
  if (typeof data === 'string') {
    // Strip accidental markdown fences.
    data = data.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    data = JSON.parse(data);
  }
  const severities = ['nuisance', 'harassment', 'threatening', 'imminent-danger'];
  const postures = Object.keys(POSTURES);
  if (!severities.includes(data.severity)) throw new Error('bad severity');
  if (!postures.includes(data.recommendedPosture)) throw new Error('bad posture');
  if (!Array.isArray(data.drafts) || data.drafts.length === 0) throw new Error('bad drafts');
  data.drafts = data.drafts.slice(0, 4).map(d => ({
    posture: postures.includes(d.posture) ? d.posture : 'firm-boundary',
    label: POSTURES[postures.includes(d.posture) ? d.posture : 'firm-boundary'],
    text: String(d.text || '').slice(0, 1200),
    rationale: String(d.rationale || '').slice(0, 600)
  }));
  data.cues = (Array.isArray(data.cues) ? data.cues : []).map(c => ({
    type: String(c.type || 'pattern'),
    label: String(c.label || c.type || 'Flagged pattern'),
    evidence: String(c.evidence || '').slice(0, 200),
    note: String(c.note || '').slice(0, 400),
    confidence: Math.max(0, Math.min(100, Number(c.confidence) || 50))
  }));
  data.contradictions = (Array.isArray(data.contradictions) ? data.contradictions : []).map(c => ({
    description: String(c.description || '').slice(0, 500),
    confidence: Math.max(0, Math.min(100, Number(c.confidence) || 50))
  }));
  return {
    provider: PROVIDER_ID,
    demoMode: false,
    severity: data.severity,
    severityConfidence: Math.max(0, Math.min(100, Number(data.severityConfidence) || 50)),
    confidenceNote: 'Model-estimated confidence — a judgment aid, not a measured probability.',
    cues: data.cues,
    contradictions: data.contradictions,
    recommendedPosture: data.recommendedPosture,
    recommendedPostureLabel: POSTURES[data.recommendedPosture],
    postureRationale: String(data.postureRationale || '').slice(0, 800),
    drafts: data.drafts,
    silenceRationale: String(data.silenceRationale || 'Silence is always an option.').slice(0, 600),
    emergency: data.severity === 'imminent-danger',
    sourceExcerpt: String(fallbackText || '').slice(0, 280),
    disclaimer: 'AI-generated analysis. V.I.K.e analyzes words and patterns — she does not detect lies or read intent. You decide what anything means.'
  };
}

async function analyze({ text }) {
  const { apiKey, model, baseUrl } = config();
  if (!apiKey) throw new Error('LLM_API_KEY is not set.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `Analyze the following message(s) the user received. Return ONLY the JSON contract.\n\n---\n${String(text).slice(0, 12000)}` }
        ]
      })
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(e.name === 'AbortError' ? 'LLM request timed out.' : `LLM request failed: ${e.message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message
    ? json.choices[0].message.content
    : null;
  if (!content) throw new Error('LLM returned no content.');
  try {
    return normalize(content, text);
  } catch (e) {
    throw new Error(`LLM returned malformed analysis (${e.message}).`);
  }
}

module.exports = { analyze, PROVIDER_ID, isConfigured };
