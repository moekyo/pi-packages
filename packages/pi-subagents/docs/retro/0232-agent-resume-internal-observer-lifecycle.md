---
issue: 232
issue_title: "Agent.resume() with internal observer lifecycle (Phase 15, Step 6)"
---

# Retro: #232 — Agent.resume() with internal observer lifecycle (Phase 15, Step 6)

## Stage: Planning (2026-05-28T18:00:00Z)

### Session summary

Produced a 3-step plan to move the observer subscribe/use/release pattern out of `AgentManager.resume()` into a new `Agent.resume(prompt, signal?)`, mirroring the `run()` wiring added in #229.
This is the last "manager reaches into Agent" duplication in the Phase 15 roadmap (Step 6, priority 8).
Confirmed the prerequisite #229 is closed and `Agent` already holds `_runner`, `observer`, `attachObserver`/`releaseListeners`, and `resetForResume`.

### Observations

- Non-breaking (`feat:`) — `AgentManager.resume()` keeps its signature and `Agent | undefined` contract; `Agent.resume()` is additive.
  No `ask_user` needed; the issue's proposed change is concrete and unambiguous.
- Observer routing equivalence verified: old code wired `onCompact` → `AgentManagerObserver.onAgentCompacted`; new code routes through the per-agent `AgentLifecycleObserver.onCompacted`, which `buildObserver()` forwards to `onAgentCompacted`.
  Net routing identical.
- Abort semantics intentionally preserved — `signal` flows straight to `runner.resume({ signal })`, not through the agent's `abortController` (resume differs from `run()` here; flagged as a Non-Goal to avoid accidental behavior change).
- Removing the `subscribeAgentObserver` import from `agent-manager.ts` must land in the same commit as the body rewrite (type checker flags the unused import). `grep` confirmed `agent.ts` remains the importer and `record-observer.ts` keeps the export live.
- Discovered the `architecture.md` class diagram is stale from #229 (missing `Agent.run()`, stale `setupWorktree`/`completeRun`/`setOnRunFinished` signatures, old `resume(id, snapshot, exec)`).
  Scoped only a light touch (resume-related entries + Step 6 ✅); full diagram refresh deferred as a follow-up.
- Lift-and-shift TDD order: step 1 introduces `Agent.resume()` alongside the old manager logic; step 2 collapses the manager method and removes the import together.
  Existing manager-level resume tests act as the integration safety net and stay.
