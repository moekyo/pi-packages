---
issue: 302
issue_title: "Child subagent shutdown unpublishes the parent's global PermissionsService"
---

# Retro: #302 — Child subagent shutdown unpublishes the parent's global PermissionsService

## Stage: Planning (2026-06-01T00:00:00Z)

### Session summary

Investigated the process-global `PermissionsService` slot bug surfaced by the `#297` composition-root suite and produced `docs/plans/0302-child-shutdown-preserves-parent-service.md`.
The fix defers `publishPermissionsService` from factory-init to a child-gated `session_start`, moves `emitReadyEvent` alongside it, and makes `unpublishPermissionsService` identity-scoped (compare-and-delete).
Plan is structured as four TDD steps: extract `isRegisteredSubagentChild`, breaking `unpublishPermissionsService` signature, the `session_start` publish gate, then docs.

### Observations

- Key constraint: the factory has **no `ctx` at init**, so an in-process child cannot be distinguished from a reloaded parent at init (both look like "slot already occupied").
  The registry signal needs a session id, which first appears at `session_start` — this forced the publish to move there, which in turn forced `permissions:ready` to move to preserve the `#297` ordering contract.
- Decided to gate on the **registry-only** `isRegisteredSubagentChild`, not the full `isSubagentExecutionContext`.
  The env/filesystem branches identify process-based subagents (own OS process, own `globalThis`) which *should* publish; only the registry branch marks an in-process child sharing the parent's `globalThis`.
- Rejected a stash/restore alternative (child captures the previous slot at init, restores it at `session_start`) — it is unsound under concurrent sibling children, where one sibling's restore writes back another sibling's service instead of the parent's.
- Chose identity compare-and-delete over a `didPublish` boolean for teardown: the boolean is unsafe if `/reload` re-runs the factory and the old instance's `session_shutdown` fires after the new instance's `session_start` re-publish.
  Identity comparison is order-independent.
- `ask_user` confirmed two decisions: move `permissions:ready` to `session_start` (recommended), and identity compare-and-delete with the maintainer's note "favor the breaking change if it makes a cleaner design" — so `unpublishPermissionsService` takes a **required** param (`feat!:`), not an optional one.
- Package public surface is only `src/service.ts` (the `.` export), which is why the signature change is genuinely public/breaking.
  Sole `src/` caller is the `index.ts` cleanup closure; consumers use only `getPermissionsService()`.
- Doc updates identified: `service.ts`, `permission-events.ts`, `docs/cross-extension-api.md` (events table + Ready Event section + reload notes), `docs/architecture/architecture.md`.
  Re-grep the package skill before the docs commit.

## Stage: Implementation — TDD (2026-06-01T14:00:00Z)

### Session summary

Executed all four TDD cycles from the plan: extract `isRegisteredSubagentChild` (`refactor:`), identity-scoped `unpublishPermissionsService` (`feat!:`), defer publish + `emitReadyEvent` to a child-gated `session_start` (`fix:`), and doc alignment (`docs:`).
Test count went from 1668 pass + 1 expected-fail to 1674 pass (the `it.fails` DESIRED test was replaced by a real passing assertion; net +5 new tests).
Final state: `check`, `lint`, `test`, and `pnpm fallow dead-code` (repo root) all green; lockfile unchanged.

### Observations

- Two extra tests beyond the plan's list assumed ready-at-load and broke under the moved timing: `composition-root.test.ts` "service and gate share one formatter registry" (resolved the service right after the factory) and `permission-events.test.ts` "ready event wiring" (bespoke fake `pi`).
  Both were updated to fire `session_start` first; noted in the `fix:` commit body.
  The planning sweep listed the two `composition-root` tests it knew about but missed these two because the grep focused on `getPermissionsService` call sites in `composition-root.test.ts` only — a wider grep across all test files for post-factory service resolution would have caught them during planning.
- The new constructor-dep order chosen for `SessionLifecycleHandler` is `(session, activateService, cleanupRpc)`, matching the plan snippet; the sole production instantiation and the `lifecycle.test.ts` `makeHandler` were updated in the same `fix:` commit (type-level break).
- The multi-instance characterization test was consolidated into one comprehensive test (`keeps the parent's service published across the child's lifecycle`) asserting identity (`toBe(parentService)`) at mid-run and after the child's shutdown — stronger than the plan's separate "survives" + "mid-run" assertions.
- Firing `session_start` through the real `SessionLifecycleHandler` in composition-root tests required a `ctx` with `cwd` (a real tmpdir, for `createPermissionManagerForCwd`), `sessionManager.getSessionId/getSessionDir/getEntries`, and `ui.setStatus`; the existing `makeChildCtx` / `makeUiCtx` helpers supplied these without modification.
- Pre-completion reviewer: WARN (no blocking issues).
  Reviewer warnings: (1) `isRegisteredSubagentChild` accepts the full `ExtensionContext` but reads only `getSessionId()` — left as-is for ISP consistency with the sibling `isSubagentExecutionContext` in the same file; (2) `activateServiceForSession` both publishes and emits ready — left as one closure since the two are co-temporal (ready must follow publish) and live at the composition root.
