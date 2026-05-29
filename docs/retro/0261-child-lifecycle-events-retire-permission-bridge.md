---
issue: 261
issue_title: "Emit child-execution lifecycle events; retire permission-bridge"
---

# Retro: #261 — Emit child-execution lifecycle events; retire permission-bridge

## Stage: Planning (2026-05-28T00:00:00Z)

### Session summary

Produced the cross-package plan (`docs/plans/0261-child-lifecycle-events-retire-permission-bridge.md`) for Phase 16, Step 1 of ADR 0002: the core publishes a `subagents:child:*` lifecycle and `@gotgenes/pi-permission-system` subscribes to `session-created` / `disposed`, retiring `permission-bridge.ts`.
Resolved the issue's "blocking investigation" by reading the SDK event bus implementation, and recorded two deferral decisions in GitHub.

### Observations

- **Blocking investigation resolved without a new SDK hook.**
  `pi.events` is a Node `EventEmitter`; `emit()` dispatches listeners synchronously on the same call stack.
  The `on` wrapper makes handlers `async`, but a *synchronous* handler body completes before `emit()` returns (the `await` only suspends after the body already ran).
  So registering in a synchronous `session-created` handler, emitted immediately before `await session.bindExtensions({})`, guarantees the registry entry exists pre-bind — identical timing to today's `registerChildSession()`.
  Encoded as a tested invariant against the real `createEventBus()`.

- **Decision: emit the full four-event lifecycle** (`spawning`, `session-created`, `completed`, `disposed`), per ADR 0002, even though only `session-created` / `disposed` have a consumer.
  Rationale: observational events are unlimited and never modify the core; the "no vacant hooks" rule constrains *provider seams*, not events.

- **Decision: defer removing the inbound `registerSubagentSession` / `unregisterSubagentSession`** from `PermissionsService` to a broader "finish the inversion" follow-up.
  Filed as **#267** (`pkg:pi-permission-system`, depends on #261).
  They are retained, caller-less, this issue.

- **Decision: keep this issue run-only**; resume executions stay detected by the permission system's filesystem-path heuristic.
  Making resume registry-detected needs the registry to shift from "executing now" to "exists" (register at creation, unregister at disposal), which is entangled with dissolving the runner.
  Added an acceptance criterion + "Registry semantics" section to **#265** capturing this so it is not lost.

- **Channel namespacing.**
  New events use `subagents:child:*` to avoid collision with the existing record-level `subagents:completed` (and siblings), which describe `AgentManager`/`SubagentRecord` background-agent transitions — a different abstraction level than per-`runAgent` child-session events.

- **Cross-package contract risk.**
  The two packages declare channel strings independently (no shared import, since neither may depend on the other under jiti).
  The channel-name string is the only coupling point; mitigated by literal-string assertions in both packages' tests and cross-referencing comments.

- **Test-migration churn flagged.**
  Adding `lifecycle` to `RunnerDeps` forces updating 18 inline `{ io, exec, registry }` call sites.
  Isolated into a standalone `test:` commit (introduce `createRunnerDeps` factory) before the interface change, to keep the `feat` commit reviewable and pay down churn for #264/#265.
