---
issue: 180
issue_title: "perf(pi-subagents): reorder append-mode system prompt to enable KV cache reuse"
---

# Retro: #180 — Reorder append-mode system prompt for KV cache reuse

## Stage: Planning (2026-05-24T20:00:00Z)

### Session summary

Produced a plan to reorder the append-mode system prompt in `buildAgentPrompt()` so the shared inherited content (~8k tokens) comes before the varying `<active_agent>` tag and env block, enabling LLM KV cache prefix reuse across subagent invocations.

### Observations

- Confirmed pi-permission-system's `ACTIVE_AGENT_TAG_REGEX.exec()` is position-independent — no changes needed in that package despite the `pkg:pi-permission-system` label on the issue.
- Only two tests assert positional ordering in append mode (`startsWith` and `tagIdx === 0`); all other prompt tests use `toContain()` and are unaffected.
- Replace mode is a separate code path and is not touched.
- The TDD cycle is minimal: one red step (update two positional assertions), one green step (reorder the return statement + update JSDoc).
