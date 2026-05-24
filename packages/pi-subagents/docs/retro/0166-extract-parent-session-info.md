---
issue: 166
issue_title: "refactor(pi-subagents): extract ParentSessionInfo from AgentSpawnConfig (13 fields)"
---

# Retro: #166 — Extract ParentSessionInfo from AgentSpawnConfig

## Stage: Planning (2026-05-24T16:00:00Z)

### Session summary

Produced a 6-step TDD plan to extract `ParentSessionInfo` from `AgentSpawnConfig`.
The refactoring groups three co-traveling fields (`parentSessionFile`, `parentSessionId`, `toolCallId`) into a named value object, reducing `AgentSpawnConfig` from 13 to 11 fields.

### Observations

- The `SubagentsService` boundary (`service-adapter.ts`) does not pass any of the three fields, so this is a purely internal refactoring with no public API impact.
- `getSessionInfo` in `AgentToolDeps` returns only `parentSessionFile` and `parentSessionId`; `toolCallId` comes from the `execute` callback's first argument — the plan keeps this separation and merges them at the `agent-tool.ts` boundary.
- `RunOptions` in `agent-runner.ts` never carried `toolCallId` (it was consumed in `AgentManager.spawn` before reaching the runner), so the nested `parentSession` on `RunOptions` only holds the two session fields.
- The deep-merge trap from the testing skill is relevant: `background-spawner.test.ts` has a `makeParams` factory that spreads flat fields — must be converted to nested `parentSession` construction.
- Issue #165 (decompose `ResolvedSpawnConfig`) is closed, so this plan builds on stable ground.

## Stage: Implementation — TDD (2026-05-24T17:00:00Z)

### Session summary

All 5 TDD cycles completed across `agent-manager.ts`, `agent-runner.ts`, `background-spawner.ts`, `foreground-runner.ts`, and `agent-tool.ts`.
Test count held steady at 805 (no net new tests — refactor only).
Type check and lint both clean after all steps.

### Observations

- The `AgentSpawnConfig` field count went from 15 to 13 (not 13 → 10 as originally estimated) — the architecture doc quoted the issue's stale count; the actual pre-refactor interface had 15 fields (`bypassQueue` and others were already present).
  The architecture doc was updated to reflect "done" with a note about the nested group rather than a specific before/after number.
- The deep-merge trap (noted in planning) did materialise: `background-spawner.test.ts`'s `makeParams` spread `Partial<BackgroundParams>` with flat fields.
  Fixed by replacing the three flat fields with a single `parentSession` object at the factory level — top-level spread still works correctly since `parentSession` is one field.
- `RunOptions` in `agent-runner.ts` needed a new import of `ParentSessionInfo` from `agent-manager.ts`; no circular dependency since `agent-runner.ts` already imports from `agent-manager.ts`.
- `agent-tool.ts` still imports `AgentSpawnConfig` (needed by `AgentToolManager` interface) — the new `ParentSessionInfo` import was added alongside it.
- All 5 commits are clean `refactor:` messages; architecture doc update is a separate `docs:` commit.
