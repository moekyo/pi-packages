---
issue: 157
issue_title: "Normalize imports: add path aliases and drop .js suffixes"
---

# Retro: #157 — Normalize imports: add path aliases and drop .js suffixes

## Stage: Planning (2026-05-23T14:30:00Z)

### Session summary

Explored all five affected packages to measure the actual scope of `.js` suffix removals and cross-boundary import rewrites.
Verified through Vite/Vitest docs that `tsconfig.json` `paths` are **not** auto-read by Vite — both `tsconfig.json` `paths` (for `tsc`) and `vitest.config.ts` `resolve.alias` (for runtime) must be set in each package.
Wrote and committed the cross-package plan at `docs/plans/0157-normalize-imports.md`.

### Observations

- `pi-subagents` is by far the largest target: ~323 `.js` suffixes across `src/` and `test/`, plus ~200 cross-boundary import rewrites.
  Mechanical sed pass scoped to `from "...foo.js"` patterns is safe — string literals containing `.js` do not match the import regex.
- Vite 8 + Vitest 4 do **not** auto-resolve `tsconfig.json` `paths`.
  The `resolve.alias` approach (object form: `"#src" → resolved src/ path`) works for prefix-style aliases and is the correct hook.
  Three packages (`pi-subagents`, `pi-permission-system`, `pi-github-tools`) need new `vitest.config.ts` files; two (`pi-autoformat`, `pi-colgrep`) need `resolve.alias` added to existing configs.
- `pi-permission-system`'s `tsconfig.json` includes a stale `"index.ts"` entry (the file does not exist); remove it in the same edit as the `tests/` → `test/` rename.
- `pi-colgrep`'s `tsconfig.json` omits `"test"` from `include` — a pre-existing gap that must be fixed to get type checking on test files.
- Single-level `../sibling` imports inside `src/` subdirectories (e.g., `forwarded-permissions/` → `../active-agent`) are intentional neighbours and are left relative per the Non-Goals section.
- Recommended execution order: `pi-github-tools` → `pi-permission-system` → `pi-subagents` → `pi-colgrep` → `pi-autoformat` (heaviest-first for the rename+alias work, lightest last).

## Stage: Implementation — Build (2026-05-23T14:35:00Z)

### Session summary

All five packages migrated in one session across five commits.
Each package received: directory rename where applicable (`tests/` → `test/`), updated `tsconfig.json` with `paths`, a `vitest.config.ts` with `resolve.alias`, `.js` suffix removal, and cross-boundary import rewrites to `#src/*` / `#test/*`.
All 2737 tests pass across all five packages post-migration.

### Observations

- `pi-permission-system` had three-level deep imports (`../../../src/`) in `test/handlers/gates/*.test.ts` — the sed pass needed three separate patterns (`../src/`, `../../src/`, `../../../src/`).
  These are now all `#src/`.
- `pi-subagents` had `vi.mock("...")` and `await import("...")` dynamic paths with `.js` suffixes that needed separate sed rules beyond the static import patterns; `vi.importActual` also needed manual fixing.
- `pi-colgrep` surfaced a **pre-existing TypeScript 6 narrowing bug** in `test/lib/reindex.test.ts` that was hidden because `test/` was not in `tsconfig.json` `include`.
  After `resolveExec = undefined`, TypeScript 6's control-flow narrowing treats subsequent `resolveExec?.()` calls as type `never` (even across `await` points).
  Fixed by casting: `resolveExec = undefined as (() => void) | undefined` — this preserves the union type and defeats TS6's narrowing.
  An `const ref = { fn: ... }` wrapper did NOT work — TS6 narrows object properties through assignments too.
- Biome reformatted two files in `pi-github-tools` and several in `pi-permission-system` after the import rewrites changed line lengths (multi-line named imports collapsed to single line).
  `pnpm exec biome check --write .` handled these cleanly.
- The `#test/*` alias was added to all packages but only used in `pi-subagents` (for `test/tools/*.test.ts` → `#test/helpers/*` imports from nested dirs).
  Other packages either don't have nested test dirs or don't cross-reference them.
