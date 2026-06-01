---
issue: 296
issue_title: "Permission forwarding broken for in-process @gotgenes/pi-subagents children — `ask` silently blocked (regression: pi-subagents v11.4.0 / pi-permission-system v8.0.0)"
---

# Retro: #296 — Permission forwarding broken for in-process pi-subagents children

## Stage: Planning (2026-06-01T13:10:00Z)

### Session summary

Wrote the implementation plan to fix the forwarding regression by backing `SubagentSessionRegistry` with a process-global instance via `globalThis` + `Symbol.for()`, mirroring the existing `src/service.ts` convention.
Confirmed through code inspection that this is a single-package fix in `pi-permission-system` despite the issue carrying both `pkg:*` labels.
The plan adds one accessor (`getSubagentSessionRegistry`) and changes one line in `index.ts`, plus doc updates.

### Observations

- The fix is single-package because the publisher and the parent-side subscription in `@gotgenes/pi-subagents` are already correct; only the registry's storage location needs to change so the child's separate jiti instance can read what the parent wrote across the per-session event-bus split.
- Verified the registration key matches the runtime lookup key: the event payload `sessionDir` equals the SDK's `SessionManager.getSessionDir()` (which returns the dir passed to `create()` unchanged; `newSession()` does not mutate it).
  So once the store is shared, the child's `registry.has(sessionDir)` hits.
- Only one production call site constructs the registry (`index.ts:41`); all other `new SubagentSessionRegistry()` uses are in tests that inject instances directly, so existing tests are unaffected.
- Deliberately omitted a shutdown/unpublish hook for the registry: a child's `session_shutdown` must not be able to wipe the parent's registrations.
  Entries are mutated only by the parent's `session-created` / `disposed` subscription.
- Surfaced a pre-existing, out-of-scope concern: concurrent sibling children of one parent share the `<parent>/<basename>/tasks` `getSessionDir()` key, so a sibling's `unregister` on disposal can break detection for still-running siblings.
  This pre-dates the regression and would need a `@gotgenes/pi-subagents` change to derive unique per-child session dirs — flagged as an Open Question / likely follow-up issue, not fixed here.
- Both code commits use `fix:` (regression restoration, patch bump); the accessor is internal, not part of the published `PermissionsService` surface, so it is not a `feat`.
- Skipped `ask_user`: the issue's suggested fix (globalThis-backed registry) is unambiguous and already weighs the rejected alternatives (env hints, shared bus).
- Doc updates needed beyond code: `docs/subagent-integration.md` (the "deterministic child detection" claim is currently misleading), `docs/architecture/architecture.md` (detection-model section + module listing), and the `package-pi-permission-system` skill ("Event-based subagent integration" section).
