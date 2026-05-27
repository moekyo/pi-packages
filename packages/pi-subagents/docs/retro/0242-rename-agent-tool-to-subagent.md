---
issue: 242
issue_title: "Rename `Agent` tool to `subagent`"
---

# Retro: #242 — Rename `Agent` tool to `subagent`

## Stage: Planning (2026-05-27T13:45:29Z)

### Session summary

Produced a plan for renaming the `Agent` tool to `subagent` across pi-subagents source, tests, README, and architecture docs.
Verified that pi-permission-system docs do not reference the `Agent` tool name and require no changes.
Scoped the plan to two commits: one `feat!:` for source + tests, one `docs:` for documentation.

### Observations

- The general-purpose agent type's `displayName` (`"Agent"` in `default-agents.ts` and `agent-types.ts` fallback) is a separate concept from the tool name and stays unchanged.
  Several test files assert this `displayName` — they are not affected by the rename.
- Issue #239 (Step 3, collapse `filterActiveTools`) is still open but independent — #242 only changes the string value in `EXCLUDED_TOOL_NAMES`, not its structure.
- The architecture doc already contains `(née \`Agent\`)` in the "What the core owns" section, anticipating the rename.
- The `widget-renderer.test.ts` comment references `"Agent"` as the general-purpose display name, not the tool name — only the comment text needs updating for clarity.

## Stage: Implementation — TDD (2026-05-27T13:55:33Z)

### Session summary

Completed 2 TDD cycles: one `feat!:` commit renaming the tool in source + tests, one `docs:` commit updating `README.md` and `docs/architecture/architecture.md`.
Baseline was 977 tests; test count unchanged at 977 after the changes.
Pre-completion reviewer returned **PASS**.

### Observations

- All changes were pure string-literal replacements in 2 source files, 4 test files, `README.md`, and the architecture doc — no logic, type, or structural changes.
- The general-purpose agent type's `displayName: "Agent"` in `default-agents.ts` and `agent-types.ts` fallback was correctly left unchanged; `display.test.ts` still passes with `"Agent"`.
- The description body inside the `agent-tool.ts` template literal needed separate edits because the guideline lines are not tab-indented (inside a backtick template literal, tab indentation does not apply).
- Pre-completion reviewer: PASS — all deterministic checks, conventional commits, documentation, code design, tests, Mermaid diagrams, and dead-code gate all passed.
