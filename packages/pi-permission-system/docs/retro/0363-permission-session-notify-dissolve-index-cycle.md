---
issue: 363
issue_title: "Add `PermissionSession.notify()` and dissolve the `index.ts` forward-reference cycle"
---

# Retro: #363 — Add `PermissionSession.notify()` and dissolve the `index.ts` forward-reference cycle

## Stage: Planning (2026-06-10T00:16:46Z)

### Session summary

Produced the implementation plan for Phase 5 Step 2 (Track A): add a Tell-Don't-Ask `notify(message)` method to `PermissionSession` and dissolve the `index.ts` forward-reference cycle (the `null as unknown as ConfigStore` cast and the `sessionNotify` holder).
Confirmed the prerequisite [#362] has shipped — `PermissionSessionLogger` is now a class — so the construction-order rework is unblocked.
The plan is a single behavior-preserving TDD cycle committed as `0363-permission-session-notify-dissolve-index-cycle.md`.

### Observations

- The cycle is genuine and bidirectional: `logger` ↔ `configStore` (via `getConfig`) and `logger` ↔ `session` (via `notify`).
  Lazy thunks over forward-declared annotated `let` bindings (no initializer, no cast) break both — `prefer-const` / biome `useConst` cannot flag them (can't suggest `const` without an initializer), and TS exempts closure captures from definite-assignment analysis.
  Established precedent: `let state: SessionState | undefined;` in `pi-autoformat/src/extension.ts`.
- Key safety insight: `configStore.refresh()` calls `logger.debug("config.loaded", …)`, whose `reportOnce` path can fire the notify sink during construction if a debug write fails IO.
  With a direct `(m) => session.notify(m)` sink, `session` must be assigned *before* `refresh()` runs — so the plan moves `configStore.refresh()` to after the `session` assignment.
  The old `sessionNotify?.` guard masked this; the new direct tell does not, hence the reorder.
- `notify` and the `index.ts` rewiring fold into **one** commit to avoid a transient `unused-class-member` flag from `fallow` between adding the method and wiring its sole production caller.
- Per the [#336] / [#362] convention, the Phase 5 metrics table and roadmap-step prose are phase-start snapshots and are left untouched; the `✓ complete` mark is a ship-time edit.
  Only the `permission-session.ts` layout line gets a small `notify` mention.
- Non-breaking: notify behavior (warning when UI active, no-op otherwise) is identical; no public API / config / default / output-shape change.
- Decided commit type `refactor:` (behavior-preserving) over `feat:`, matching [#362]'s precedent for this Track-A series.
