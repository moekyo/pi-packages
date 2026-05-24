---
issue: 169
issue_title: "refactor(pi-subagents): extract RunContext from RunOptions (12 fields)"
---

# Retro: #169 — extract RunContext from RunOptions

## Stage: Planning (2026-05-24T17:07:10Z)

### Session summary

Produced a plan to extract 4 parent-context fields (`exec`, `registry`, `cwd`, `parentSession`) from `RunOptions` into a nested `RunContext` interface.
The plan is a single-step refactor (all changes in one commit) plus a comment-update commit, affecting 3 source files and 3 test files.

### Observations

- The issue body proposed flat `parentSessionFile`/`parentSessionId` fields on `RunContext`, but #166 already grouped these into `ParentSessionInfo`.
  The plan uses `parentSession?: ParentSessionInfo` instead, preserving the existing grouping.
- `RunOptions` is purely internal — not exported via `service.ts` — so the refactor is non-breaking.
- All test call sites construct `RunOptions` inline (no `Partial<RunOptions>` spread patterns), so TypeScript will catch any missing `context` field at compile time.
- The change is small enough to land in a single TDD step — no lift-and-shift needed.
- Prerequisite #164 (directory reorganization) is already implemented.
