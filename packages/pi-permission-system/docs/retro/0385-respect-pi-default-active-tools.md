---
issue: 385
issue_title: "pkg:pi-permission-system — Respect pi default active tool set instead of activating all non-denied tools"
---

# Retro: #385 — Respect pi default active tool set instead of activating all non-denied tools

## Stage: Planning (2026-06-11T21:43:29Z)

### Session summary

Planned the fix for `AgentPrepHandler.handle()` activating pi's off-by-default tools (`find`/`grep`/`ls`) in every session.
The fix switches the base set from `pi.getAllTools()` to `pi.getActiveTools()`, making the permission system purely restrict-only.
Evaluated the issue author's reference PR [#386] and adopted its approach with two improvements: typing `getActive(): string[]` to match the real SDK contract (PR used `unknown[]`) and adding an explicit regression test.

### Observations

- Confirmed via the SDK `.d.ts` that `getActiveTools()` returns `string[]` while `getAllTools()` returns `ToolInfo[]`.
  PR #386's test mocks return objects for `getActive`, which pass only because `getToolNameFromValue` tolerates both shapes — a fidelity gap the plan fixes by returning bare strings everywhere.
- `PermissionGateHandler` keeps `getAll()` for `validateRequestedTool` (registration checks must see the full registry); only `AgentPrepHandler` switches to `getActive()`.
  This leaves a latent ISP seam (disjoint consumer slices of `ToolRegistry`) — recorded as track-and-watch, not split now.
- Classified as **breaking** (confirmed with the user via `ask_user`): the main session's effective tool set changes on upgrade without a user edit, so `fix!:` + `BREAKING CHANGE:` footer.
  The restrict-only contract means users wanting `find`/`grep`/`ls` active must enable them via pi's own `activeTools` config.
- Verified idempotence: starting from the active set makes the operation purely subtractive toward a fixed point, so no oscillation across repeated `before_agent_start` fires.
- Key risk flagged for TDD: confirm `getActiveTools()` is already populated with pi's defaults when `before_agent_start` fires (lifecycle timing).
  PR #386's existence suggests the reporter validated this empirically.
- Credit: Ben Tang (@0xbentang) reported #385 and authored reference PR [#386].
  The plan records a `Co-authored-by: Ben Tang <bentang@fastmail.com>` trailer for the implementation commits so the credit lands in git history.

## Stage: Implementation — TDD (2026-06-11T22:05:26Z)

### Session summary

Completed all three planned TDD cycles: (1) added `getActive(): string[]` to `ToolRegistry` and wired it to `pi.getActiveTools()` plus every fixture/fake; (2) added a regression test and switched `AgentPrepHandler.handle()` from `getAll()` to `getActive()` (the breaking `fix!:`); (3) clarified the restrict-only contract in `docs/configuration.md`.
Test count went from 1921 to 1922 (+1 regression test); `check`, `lint`, and `fallow dead-code` all green.

### Observations

- Plan deviation (benign): the plan's Module-Level Changes listed `test/handlers/external-directory-session-dedup.test.ts` and `test/handlers/tool-call.test.ts` as needing `getActive` edits, but both consume the shared `makeToolRegistry` factory, which now supplies a default `getActive`.
  Neither file needed touching — TypeScript passing at both call sites confirms the interface is satisfied.
  This is a small simplification over reference PR [#386], which added redundant `getActive` stubs to those files.
- The regression test (`does not activate registered tools pi left inactive (find/grep/ls)`) sets `getActive` to the default four and `getAll` to a seven-tool superset, asserting `setActive` is called with exactly the four.
  It failed cleanly on the old `getAll()` handler (called with all seven) and passed after the switch — the canonical guard for #385.
- Pre-completion reviewer: PASS.
  One non-blocking WARN: the `allTools` variable in `before-agent-start.ts` now holds pi's active subset, so the name misled.
  Renamed it to `activeTools` and folded the rename into the `fix!:` commit (via `git reset --soft` + `--amend`, unpushed) rather than a follow-up.
- The `fix!:` and `feat:` commits both carry the `Co-authored-by: Ben Tang <bentang@fastmail.com>` trailer (verified it survived the amend).

[#386]: https://github.com/gotgenes/pi-packages/pull/386
