---
issue: 218
issue_title: "Push SDK boundary in settings.ts (Phase 13, Step 5)"
---

# Retro: #218 — Push SDK boundary in settings.ts

## Stage: Planning (2026-05-26T17:01:55Z)

### Session summary

Produced a 3-step TDD plan to inject `agentDir: string` into `SettingsManager` and `loadSettings`, removing the only Pi SDK import from `settings.ts`.
The change is straightforward — a single parameter addition threading through constructor, free function, and boundary wiring.

### Observations

- The change is entirely mechanical: no design ambiguity, no new abstractions, no breaking public API.
- The main implementation effort is in test updates (~35 `new SettingsManager(...)` call sites plus ~15 `loadSettings(...)` calls), all requiring an `agentDir` argument.
- All test `describe` blocks that manipulate `PI_CODING_AGENT_DIR` env var can drop that scaffolding entirely, simplifying setup/teardown.
- `saveSettings` has no SDK dependency and needs no signature change — only `loadSettings` calls `globalPath()`.

## Stage: Implementation — TDD (2026-05-26T17:13:26Z)

### Session summary

Completed all 3 plan steps across 2 commits plus 1 doc commit.
All 970 tests pass; `settings.ts` now has 0 Pi SDK imports and all `PI_CODING_AGENT_DIR` env var manipulation is gone from `settings.test.ts`.

### Observations

- **Steps 1+2 combined:** Changing `loadSettings(cwd)` to `loadSettings(agentDir, cwd)` forced updating `SettingsManager.load()` in the same commit — they were inseparable (esbuild skips type checks, so the old call compiled but produced wrong runtime behavior).
  The two production changes landed in one commit with a note in the body.
- **Test simplification was significant:** Removed `originalAgentDirEnv` save/restore scaffolding from 5 `describe` blocks; the test code shrank by 32 lines net.
- **`/nonexistent` sentinel:** Tests that construct `SettingsManager` but never call `load()` pass `agentDir: "/nonexistent"` — a clear signal the field is unused in that scope.
- Architecture doc Step 5 heading marked `✓` and folded into the last `feat:` commit by `pi-autoformat`.
