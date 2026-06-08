---
issue: 350
issue_title: "~ and $HOME patterns footgun"
---

# Retro: #350 — ~ and $HOME patterns footgun

## Stage: Planning (2026-06-08T19:40:13Z)

### Session summary

Diagnosed the reported footgun: path **patterns** are home-expanded by `compileWildcardPattern` (via `expandHomePath`), but tool-call and bash path **values** flow through `normalizeInput` raw, so a `~/.ssh/config` value never matches a `~/.ssh/*` deny rule — a silent permission bypass.
Produced a numbered plan (`docs/plans/0350-home-expand-path-values.md`) with two coordinated fixes that both reuse the existing `expandHomePath`, plus TDD cycles and doc updates.

### Observations

- Root cause is asymmetry, not a missing feature: expansion happens on one side of the match only.
  The fix is to home-expand path **values** symmetrically at the single choke point, `normalizeInput`.
- Both `describePathGate` and `bash-path.ts` route through `permissionManager.checkPermission` → `normalizeInput`, so one change in `normalizeInput` fixes the cross-cutting `path` surface for tool calls **and** bash, plus per-tool path patterns.
- Decision (`ask_user`): code fix, not docs-only — this is an under-matching `deny` bypass, the worst failure mode for a least-privilege gate; the docs example (`~/.ssh/*`) is correct intent.
- Decision (`ask_user`): home-expand values **only**, not full cwd-canonicalization.
  Patterns are not cwd-resolved today (so glob patterns like `*.env` match anywhere); home-expand-only keeps that and avoids regressing relative patterns.
- Secondary fix included: `normalizePathForComparison` currently expands `~` but not `$HOME`; routing it through `expandHomePath` brings the `external_directory` surface (and bash external-path / skill-read) to `$HOME` parity.
  Flagged in Open Questions as splittable if review wants tighter scope.
- Existing tests stay green: current `input-normalizer.test.ts` and `external_directory` integration cases use non-home or already-absolute values, which `expandHomePath` leaves untouched.
  No existing assertion needs flipping; the change only adds previously-missing matches.
- Home-expansion tests must mock `node:os` (`vi.hoisted` + `vi.mock` with a `default` key) as in `expand-home.test.ts`.

## Stage: Implementation — TDD (2026-06-08T19:53:29Z)

### Session summary

Executed all 4 TDD cycles from the plan in a single session, then added a fifth `refactor:` commit (out of plan) consolidating path-surface value normalization.
Two production files changed (`src/path-utils.ts` and `src/input-normalizer.ts`), adding 24 new tests across 5 test files.
Test count grew from 1813 to 1837 (+24).

### Observations

- **Step 1 deviation** — After dropping the inline `~/` expansion block from `normalizePathForComparison`, the unused `homedir` import was correctly dropped, but `join` was accidentally removed from the same `node:path` import line.
  Caught immediately by the red run (4 `ReferenceError: join is not defined` failures) and fixed before the green commit.
- The `SPECIAL_PERMISSION_KEYS` branch in `normalizeInput` already used `pathValue ?? "*"` (nullish coalescing), so the null guard required by the plan (`pathValue === null ? "*" : expandHomePath(pathValue)`) was a natural replacement; no logic change was needed beyond adding the expansion call.
- Integration tests in `permission-manager-unified.test.ts` confirmed that 3 of the 6 new home-expansion cases were already passing before Fix 2 (the ones that used `homedir()` directly as an already-absolute path).
  Only 3 tests were red before the production change: raw `~/...`, raw `$HOME/...`, and per-tool `~/...` — exactly the reported bug surface.
- The bash parser's `resolveNodeText` returns `$HOME` as the literal text of a `simple_expansion` node, so `cat $HOME/.ssh/config` produces the token `"$HOME/.ssh/config"` — the gate characterization test for that token is valid.
- **Out-of-plan refactor (user-requested)** — After the plan steps, review surfaced near-duplicate path-value handling in `normalizeInput` (the two path branches each did `extract → home-expand → fallback to "*"`).
  Per a `full consolidation` `ask_user` decision, extracted a private `normalizePathSurfaceValue(input)` helper owning that shared concern.
  This unified extraction on `getNonEmptyString` (was a raw `typeof === "string"` check in the special-keys branch), a deliberate small behavior change: the `path` / `external_directory` surfaces now coerce empty/whitespace-only paths to `"*"` and trim before matching — matching the path-bearing tools' prior behavior.
  Covered by 3 new tests; `getPathBearingToolPath` import dropped from `input-normalizer.ts` (still has 3 live gate consumers, so no dead-code regression).
- Pre-completion reviewer: **PASS** (re-dispatched after the refactor) — no warnings issued in either run.
