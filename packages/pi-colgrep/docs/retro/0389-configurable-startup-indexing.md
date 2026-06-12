---
issue: 389
issue_title: "pi-colgrep always starts indexing on startup"
---

# Retro: #389 — pi-colgrep always starts indexing on startup

## Stage: Planning (2026-06-12T00:15:50Z)

### Session summary

Planned the response to a third-party feature request (graelo) that pi-colgrep blocks Pi startup by indexing eagerly on `session_start`.
Confirmed the direction with the operator via three `ask_user` gates and produced `packages/pi-colgrep/docs/plans/0389-configurable-startup-indexing.md` with six TDD cycles.
The agreed approach is "both": run the startup index in the background (non-blocking) and make it disable-able via a `config.json` boolean `indexOnStartup` (default `true`, non-breaking).

### Observations

- The issue's `pkg:pi-subagents` label is wrong; the body and content are unambiguously about `pi-colgrep`.
  Filed the plan under `packages/pi-colgrep/`.
- Key realization: the colgrep CLI's `search` already auto-indexes on demand, so lazy indexing is free; the extension's `await reindexer.runNow()` on `session_start` is the only blocking cost.
- Operator-driven refinements beyond the raw proposal: (1) background + disable-able, not a trigger-policy enum; (2) gate the existing write/edit auto-reindex on whether an index already exists, checked **once** at startup via `colgrep status`, not per edit; (3) warn once per session when skipping; (4) flip the `indexExists` gate when the user manually runs `/colgrep-reindex`.
  Operator also chose the name `indexExists` over `indexEstablished`.
- Found a real concurrency gap to fix before backgrounding: `reindexer.runNow()` neither assigns `inflightPromise` (so `shutdown()` cannot await a fire-and-forget run) nor guards against a concurrent `runNow()` (so `/colgrep-reindex` mid-startup would launch a second `colgrep init`).
  Cycle 3 closes both via a coalescing `startRun()`.
- Verified empirically: `colgrep status <path>` exits `0` whether or not an index exists and has no `--json`; index existence must be parsed from stdout (`No index found` is the stable negative signal).
  Captured this as the `indexExistsFromStatus` pure predicate.
- Config module mirrors the `pi-github-tools` / `pi-subagents-worktrees` convention (global `<agentDir>/extensions/pi-colgrep/config.json` + project `<cwd>/.pi/extensions/pi-colgrep/config.json`, project wins), which matches graelo's suggested path.
  No `package-pi-colgrep` skill file exists despite the AGENTS.md reference, so no internal-docs update is needed.
- Classified non-breaking: default `indexOnStartup: true` preserves eager indexing (now non-blocking); write/edit gating is transparent for default users because the startup index sets `indexExists = true`.

## Stage: Implementation — TDD (2026-06-12T01:26:47Z)

### Session summary

Implemented all six TDD cycles from the plan across 6 `feat`/`docs` commits.
Added `src/lib/config.ts` (the `indexOnStartup` loader) and `src/lib/index-status.ts` (the `colgrep status` index-existence probe), hardened `src/lib/reindex.ts` so `runNow()` coalesces concurrent runs and tracks its in-flight promise, made the `session_start` startup index fire-and-forget gated on config, and gated the write/edit auto-reindex on a once-per-session `indexExists` probe with a one-time skip notice and a flip on `/colgrep-reindex`.
Test count went 87 → 116 (+29); full suite, `check`, `lint`, and `fallow dead-code` all green.

### Observations

- Two intentional deviations from the plan's literal cycle boundaries: (1) the `colgrep status` probe assertion was implemented in Cycle 5 alongside its consumer rather than Cycle 4, to keep Cycle 4 free of a write-only variable (biome `noUnusedVariables`); (2) the extension-level "`shutdown()` awaits the backgrounded startup index" behavior is covered by the Cycle 3 reindexer unit test rather than a duplicate extension-level test.
- Existing `session_start` tests used one blanket `mockResolvedValue` for every `exec` call; the new `colgrep status` probe returns `""` under that mock, which `indexExistsFromStatus` reads as "index exists" (`true`), so the legacy `tool_result` scheduling tests kept passing unchanged.
- Extension tests mock `#src/lib/config` via a `vi.hoisted` `loadConfig` stub so `indexOnStartup` is controllable without touching the filesystem; the real `getAgentDir()` and path builders run but their output is ignored by the mocked loader.
- The "non-blocking" assertion is expressed by holding the `init` exec and checking that `session_start` returns with the indexing status still set (not cleared) — a clean proxy for "the handler didn't await the build".
- The status-clear test needed draining: with fire-and-forget startup, the status-clear runs after the handler returns, so the test now triggers `session_shutdown` (which awaits the in-flight run via the Cycle 3 hardening) before asserting.
- Pre-completion reviewer verdict: PASS — ready for `/ship-issue`.
  No WARN findings.
  Reviewer noted the pre-existing duplicated inline `exec` wrapper literal in `extension.ts` is not introduced by this PR.
