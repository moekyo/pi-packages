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
