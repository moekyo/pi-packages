---
issue: 229
issue_title: "Agent born complete: Agent.run() absorbs startAgent (Phase 15, Step 4)"
---

# Retro: #229 — Agent born complete: Agent.run() absorbs startAgent

## Stage: Planning (2026-05-27T18:00:00Z)

### Session summary

Produced a 9-step TDD plan for absorbing `AgentManager.startAgent()` into `Agent.run()`.
Key design decisions: per-agent `AgentLifecycleObserver` interface passed at construction (chosen over callback fields and EventEmitter), and fully async worktree error surface (chosen over split sync/async).

### Observations

- **Observer pattern chosen over callbacks:** The per-agent `AgentLifecycleObserver` interface replaces three separate mechanisms (`onSessionCreated` callback, `setOnRunFinished`, `onCompact` callback).
  All methods are optional, composed by `AgentManager.buildObserver()` per spawn.
- **`ParentSessionInfo`/`CompactionInfo` relocation needed:** `agent.ts` importing from `agent-manager.ts` would create a circular type import (agent-manager already imports `Agent`).
  Moving both types to `types.ts` in step 1 avoids the cycle.
- **`AgentInit` grows wide (15+ optional fields):** Making run-config fields optional preserves backward compat for the 55+ `new Agent()` calls in tests.
  Noted as a known smell — follow-up issues (#230 ConcurrencyQueue, potential `AgentInit` restructuring) may address this.
- **Async error surface changes tool behavior:** `background-spawner.ts`'s try/catch around `manager.spawn()` becomes unreachable for worktree errors.
  Keeping it for robustness; the error surfaces on `record.error` instead.
- **Lift-and-shift TDD order:** Steps 3–5 incrementally change `AgentInit`, `setupWorktree`, and `completeRun`/`failRun` before step 6 adds `Agent.run()`.
  This avoids a single massive step that rewrites everything at once.
