# Founder frameworks — Omni integration point

This directory is where Sean's proprietary materials plug in.

## How it works

- Drop Sean's framework documents here as **`.md` or `.txt`** files
  (e.g. `omni-algorithm.md`, `flywheel-notes.md`).
- On **every** analysis call, the backend (`analysis/prompt.js`) reads all
  `.md`/`.txt` files in this directory (except this README) and injects
  them into the real-LLM system prompt under a **"Founder frameworks"**
  section.
- Files are re-read per request — **no server restart needed** after
  adding or editing them.
- Files are capped at ~12KB each for prompt safety.

## Notes

- These materials are only sent to the LLM provider as prompt context.
  They are never exposed to the frontend or to end users.
- Do NOT commit API keys or secrets here. This directory is prompt
  context, not a vault.
- The mock/demo provider does not use these files (it is pattern-based
  by design). They take effect the moment `LLM_PROVIDER=openai` with a
  valid key.
