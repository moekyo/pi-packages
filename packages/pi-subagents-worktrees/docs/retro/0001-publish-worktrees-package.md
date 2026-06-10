---
issue: 369
issue_title: "pi-subagents-worktrees packages > 0.0.1 not published on npm"
---

# Retro: #369 — pi-subagents-worktrees packages > 0.0.1 not published on npm

## Stage: Planning (2026-06-10T01:50:32Z)

### Session summary

Diagnosed why `@gotgenes/pi-subagents-worktrees` is stuck at `0.0.1` on npm despite GitHub releases through `0.2.2`: the `packages` array in `scripts/publish-released.sh` hardcodes six packages and never included `pi-subagents-worktrees`, so the CI `publish` job silently skipped it on every release.
The `0.0.1` on npm was a one-off manual scaffold-time publish (no `pi-subagents-worktrees-v0.0.1` git tag exists).
Produced `packages/pi-subagents-worktrees/docs/plans/0001-publish-worktrees-package.md` — first plan/retro in this package.

### Observations

- Two decisions surfaced via `ask_user`: backfill scope (chose **only `0.2.2`**, the current latest, not the intermediate `0.1.0`/`0.2.0`/`0.2.1`) and backfill mechanism (chose **manual local publish without `--provenance`** over a new `workflow_dispatch` CI job).
- The fix is split: a committed one-line allowlist addition in `scripts/publish-released.sh` (recurrence prevention) plus an operational runbook for the maintainer to `pnpm --filter @gotgenes/pi-subagents-worktrees publish` `0.2.2` (backfill).
- The script edit lives at repo root, outside every `packages/<dir>` scope, so it triggers **no** release-please version bump — intentional and important: we are not cutting `0.2.3`.
- Root cause is a duplicated source of truth — the package list exists in both `release-please-config.json` and `scripts/publish-released.sh`.
  Rejected folding the structural fix (derive the script's list from `release-please-config.json` via `jq`) into this change to keep blast radius small; captured it as an Open Question / follow-up instead.
- Package is ship-source: no `files` allowlist, no `prepack`/`prepublishOnly`, so the backfill publish needs no build step.
- No automated test exists for the bash publish script; verification is `bash -n` plus the next-release end-to-end signal.
  Next stage is `/build-plan` (script edit + runbook), not `/tdd-plan`.

## Stage: Implementation — Build (2026-06-10T02:10:00Z)

### Session summary

Added `"packages/pi-subagents-worktrees:@gotgenes/pi-subagents-worktrees"` to the `packages` array in `scripts/publish-released.sh` in one commit.
The backfill runbook (step 2 from the plan) is operational — it is documented in the plan and will be posted to the issue by `/ship-issue`, not committed.
No TypeScript or test files were modified; `bash -n` confirmed script syntax; all lint and test checks passed.

### Observations

- Single committed change: one insertion in `scripts/publish-released.sh` — exactly as planned, no deviations.
- `bash -n` syntax check passed immediately; lint (Biome + ESLint) exited clean (the 3 Biome `INFO`-level suggestions are in `packages/pi-permission-system/`, an unrelated prior session).
- Pre-completion reviewer returned **PASS** — all deterministic checks clean, conventional commits valid, no dead code, no test artifacts expected for a bash-only change.
- The backfill runbook to publish `0.2.2` to npm locally must be executed by the maintainer after `/ship-issue` pushes and CI passes.
  Exact commands: `npm whoami`, then `pnpm --filter @gotgenes/pi-subagents-worktrees publish --access public --no-git-checks`, then `npm view @gotgenes/pi-subagents-worktrees version` to confirm `0.2.2` resolves.
