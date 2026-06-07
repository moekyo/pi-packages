---
issue: 340
issue_title: "Extract a PermissionResolver collaborator out of PermissionSession"
---

# Retro: #340 — Extract a PermissionResolver collaborator out of PermissionSession

## Stage: Planning (2026-06-07T15:34:44Z)

### Session summary

Produced the numbered plan for Phase 4, Step 7 — promoting `permission-resolver.ts` from a one-method interface into a concrete `PermissionResolver` class that holds `ScopedPermissionManager` + `SessionRules` and owns the resolution surface, then removing the resolve role from `PermissionSession`.
Confirmed dependencies are complete (Step 1 `#334` and Step 6 `#339` both CLOSED) and read the resolver/session/runner/pipeline source plus the affected test fixtures.

### Observations

- Naming was the genuine design choice, surfaced via `ask_user`.
  The user chose: the concrete class takes the canonical name `PermissionResolver`, and the narrow `{ resolve }` role interface is renamed `ScopedPermissionResolver` (symmetric with `ScopedPermissionManager`).
  This forces a dedicated rename step (Step 1) before the class can be introduced.
- Scope decision (not asked — determined by the Step 6 precedent and the issue headline): full removal of the resolve role from the session (Option Y), not transitional delegation.
  This requires restructuring `ToolCallGatePipeline` (split `resolver` out of `ToolCallGateInputs`) — a file the roadmap's 3-file target list omits, but the list is known-approximate (it also omitted `runner.ts`).
- The session keeps `checkPermission` / `getToolPermission` / `getConfigIssues` / `getPolicyCacheStamp` as transitional duplicates (still needed by `AgentPrepSession` / `SessionLifecycleSession` / `SkillPermissionChecker`); their removal + handler rewiring is explicitly Step 8 (`#341`).
  The resolver carries them now to set up Step 8 and match the issue's stated resolution surface.
- Shared-instance contract: session and resolver hold the *same* `permissionManager` + `sessionRules` injected from the composition root, so no split-brain (mirrors `#337`'s `ExtensionRuntime` dissolution).
- `SkillInputGatePipeline` needs no interface change — the `PermissionResolver` class satisfies `SkillInputGateInputs` (`{ checkPermission }`) structurally; only its construction site moves from `session` to `resolver`.
- TDD plan uses lift-and-shift: rename interface first, add class + rewire `GateRunner`/`SkillInputGatePipeline`, then `ToolCallGatePipeline`, then drop `session.resolve` last (once it has no consumers).

## Stage: Implementation — TDD (2026-06-07T17:19:30Z)

### Session summary

Completed all 5 TDD steps from the plan: renamed `PermissionResolver` interface to `ScopedPermissionResolver`, added the concrete `PermissionResolver` class, routed `GateRunner` and `SkillInputGatePipeline` through it, injected it into `ToolCallGatePipeline` (splitting the resolver out of `ToolCallGateInputs`), removed the resolve role from `PermissionSession`, and updated architecture and skill docs.
Test count moved from 1823 (baseline) to 1828 (net +5: 9 new resolver tests minus 4 removed session resolve tests).
Pre-completion reviewer: PASS — no warnings.

### Observations

- **Unplanned deviation**: `test/helpers/handler-fixtures.ts` (`makeSession`, `makeHandler`) and `test/handlers/external-directory-session-dedup.test.ts` (`makeStatefulSession`, `makeHandlerForSession`) both had a `resolve` field/closure on the `MockGateHandlerSession` because `ToolCallGateInputs` previously extended `ScopedPermissionResolver`.
  Both needed to drop the `resolve` field and create a local resolver closure (`{ resolve: (s, i, a) => session.checkPermission(s, i, a, session.getSessionRuleset()) }`) to pass to `GateRunner` and `ToolCallGatePipeline`.
  These files were not listed in the plan's Module-Level Changes (an expected gap — the plan noted the 3-file scope was approximate).
- **Fallow suppression**: `getToolPermission`, `getConfigIssues`, and `getPolicyCacheStamp` on `PermissionResolver` are flagged as unused class members by `fallow` because no handler has been rewired to them yet (that is Step 8 `#341`).
  Used `// fallow-ignore-next-line unused-class-member` (singular — fallow parses every space-separated token after the directive as an issue kind, so trailing prose comments create stale-suppression noise; the fix was to use the exact kind only).
- **`makeResolver()` default**: `makeResolver()` with no argument returns a `vi.fn()` that returns `undefined`.
  All pipeline tests that needed an allow result had to call `makeResolver(makeCheckResult())` explicitly — this was missed in the initial test rewrite and caught by the runtime failure (`Cannot read properties of undefined (reading 'command')`) rather than by type-check.
