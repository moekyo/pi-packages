---
issue: 277
issue_title: "Encapsulate AgentSession behind SubagentSession; retire the remaining agent.session reach-throughs"
---

# Retro: #277 — Encapsulate AgentSession behind SubagentSession

## Stage: Planning (2026-05-30T12:00:00Z)

### Session summary

Produced an 8-step TDD plan covering delegate methods on `SubagentSession`, intent-revealing methods on `Agent`, caller migration across tools/service/UI/observation, observer callback narrowing, and `Agent.session` getter removal.
The plan extends the issue's three proposed methods with `getContextPercent()`, `subscribeToUpdates()`, and `messages` to fully satisfy the acceptance criterion that no production module outside `lifecycle/` references the raw `AgentSession`.

### Observations

- `subscribeAgentObserver` already accepts `SubscribableSession` (not `AgentSession`), so adding `subscribe()` to `SubagentSession` enables passing it directly — no `session` getter needed for observer wiring.
- The `onSessionCreated` observer callback delivers raw `AgentSession` to spawners in `tools/`.
  The plan narrows it to `(agent: Agent)` and has spawners use `agent.subagentSession!` which structurally satisfies both `SubscribableSession` and `SessionLike` via the new delegate methods.
- The conversation viewer uses `session.messages` for rendering and `session.subscribe()` for live updates — both require delegate methods beyond the issue's three proposed methods.
- `queueSteer()` and `flushPendingSteers()` become private after migration, which requires migrating existing tests that call them directly.
- The public API surface (`SubagentsService` + `SubagentRecord`) is unaffected — `Agent` is internal.
