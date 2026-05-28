---
issue: 256
issue_title: "Extract WorktreeIsolation collaborator"
---

# Retro: #256 — Extract WorktreeIsolation collaborator

## Stage: Planning (2026-05-28T23:44:23Z)

### Session summary

Produced a numbered implementation plan for extracting a `WorktreeIsolation` collaborator (Phase 16, Step 1) that owns the worktree lifecycle (`setup`, `path`, `cleanup`) so `Agent` tells one collaborator instead of orchestrating `_worktrees` + `_isolation` + `worktreeState` itself.
The plan covers the new module, `Agent`/`AgentManager`/`service-adapter` wiring, the `WorktreeState` deletion, doc updates, and a 4-cycle TDD order.

### Observations

- Decision: fold `WorktreeState` into `WorktreeIsolation` (delete `worktree-state.ts`) rather than wrap it.
  The architecture target table already lists `WorktreeIsolation` as absorbing `worktrees` + `isolation` + `worktreeState`, and the user confirmed a fold preference when the doc had already decided it.
- `WorktreeManager.cleanup(wt, ...)` mutates `wt.branch` in place; `WorktreeIsolation` must store a mutable `WorktreeInfo` (`_info`) to preserve that behavior — flagged as the top risk.
- `AgentInit` net field change is −1 (removes `worktrees` + `isolation`, adds `worktree`), not −2 as the issue text loosely states; instance fields drop by 2 and `setupWorktree()` is removed.
- The `missing worktrees dependency` defensive branch becomes structurally impossible (collaborator is only built with a manager) and is dropped.
- Verified no consumer imports the `WorktreeCleanupResult`/`WorktreeInfo` re-exports from `worktree-state.ts` — they all import from `worktree.ts`, so deletion is safe.
- Step 2 (the integration) is a single commit because the type checker forbids removing `AgentInit` fields while call sites still pass them; bulk of `agent.test.ts` is untouched, only worktree helpers/describe blocks change.
- Doc updates needed: architecture class diagram + layout listing, and the package `SKILL.md` Lifecycle domain row (module count stays 9).
- This step is independent of Step 2 (#257, `ChildSessionFactory`) per the architecture's Track A.
