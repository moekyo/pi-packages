---
issue: 342
issue_title: "Retire the permission-system.test.ts catch-all"
---

# Retro: #342 — Retire the `permission-system.test.ts` catch-all

## Stage: Planning (2026-06-08T02:08:35Z)

### Session summary

Produced a redistribution plan for the 2,785-line `permission-system.test.ts` catch-all (~86 `test()` blocks).
Inventoried every test by fixture usage (`createManager`, `createManagerWithProject`, `new PermissionManager`, and the end-to-end `createToolCallHarness`) and mapped each concern to a co-located destination.
Confirmed all prerequisites are met — Step 8 ([#341]) is closed, so the collaborators are independently constructable.

### Observations

- The catch-all cleanly splits into two families: synchronous config-resolution tests (clear homes, move verbatim) and end-to-end async `tool_call` tests (overlap with existing `makeHandler` / `makeFakePi` handler and composition-root tests).
- Used `ask_user` once on the two genuine ambiguities.
  Decisions: (1) async integration tests — drop-redundant / move-unique rewritten onto `makeHandler`, not promote the heavy `createToolCallHarness`; (2) assertion fidelity — behavior-preserving (adapt to destination fixture), not byte-for-byte.
  These shape the plan toward a smaller, fully co-located suite rather than a faithful-but-heavy lift-and-shift.
- Three source modules (`status.ts`, `logging.ts`, `before-agent-start-cache.ts`) have no co-located test file today; the plan creates `test/status.test.ts`, `test/logging.test.ts`, `test/before-agent-start-cache.test.ts`.
- `createManagerWithProject` (catch-all local helper, 5 callers) is promoted to `test/helpers/manager-harness.ts`.
- This is test-only and behavior-preserving — no red phase.
  Plan recommends executing with `/build-plan`, not `/tdd-plan`, with migration steps as move → run-full-suite → commit (`test:`).
- The largest bucket (~43 tests) lands in `permission-manager-unified.test.ts`; split across two steps (surface-resolution, then session-aware `checkPermission`) to keep commits reviewable.
- Two deferred open questions left for execution: exact home for the unique `session_shutdown clears` case, and `config-store` vs `policy-loader` for `getResolvedPolicyPaths`.
- `design-review` skill judged not applicable — no production interface or wiring changes; only a test fixture is promoted.
- Step 9 of the Phase 4 roadmap in `docs/architecture/architecture.md` must get `✓ complete` in the final step.

[#341]: https://github.com/gotgenes/pi-packages/issues/341

## Stage: Implementation — TDD (2026-06-08T13:09:43Z)

### Session summary

Executed all 9 migration steps from the plan. 76 tests redistributed across 12 destination files; 10 redundant end-to-end async tests dropped.
The 2,785-line `permission-system.test.ts` catch-all was deleted; the suite is now fully co-located at 90 test files, 1813 tests.

### Observations

- No red phase throughout — suite stayed green at every commit, confirming the lift-and-shift approach was correct.
- `pi-autoformat` reflowed several files after edits; re-read before subsequent edits was occasionally needed (no failures resulted).
- The two deferred open questions from planning resolved cleanly: `getResolvedPolicyPaths` landed in `permission-manager-unified.test.ts` (not `config-store.test.ts`) since that file already held all other direct-`PermissionManager` integration tests; the `session_shutdown clears approvals` test landed in `external-directory-session-dedup.test.ts` with inline session wiring (not `composition-root.test.ts`), avoiding the need to set up full `piPermissionSystemExtension` + real config for one test.
- 10 redundant async tests were dropped: 5 path-bearing `tool_call` external_directory tests (covered by `external-directory-integration.test.ts`), 1 bash external_directory `deny` test (covered by `tool-call.test.ts`), 1 generic ask serialization test (rewritten onto `makeHandler`), and 3 session-approval dedup tests (covered by `external-directory-session-dedup.test.ts`).
- The reviewer flagged two documentation WARNs: (1) `package-pi-permission-system` skill didn’t mention the new `createManagerWithProject` export; (2) Step 8 (#341) in `architecture.md` was missing `✓ complete`.
  Both fixed before the final commit.
- `pnpm fallow dead-code` exited zero — no dead exports introduced.
- Pre-completion reviewer: PASS.
