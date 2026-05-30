---
issue: 266
issue_title: "Configurable input preview length + smart formatters for known MCP tools"
---

# Retro: #266 — Configurable input preview length + smart formatters for known MCP tools

## Stage: Planning and Phase 1 Improvement Roadmap (2026-05-30T12:00:00Z)

### Session summary

Started with `/plan-issue #266` but the user steered the session toward identifying prerequisite structural work before writing a plan.
Through Socratic questioning ("What work would make this easier?", "What other collaborators are missing?"), the session produced a Phase 1 improvement roadmap for pi-permission-system focused on making #266 easy to implement.
Created two new issues (#282: extract `ToolPreviewFormatter`, #283: formatter extension seam) and updated #266 with the implementation plan.

### Observations

#### What went well

- The user's Socratic steering (strategic questions before artifact production) shaped the output into a focused improvement roadmap rather than a standard plan file.
  This produced a better dependency-ordered result than the standard `/plan-issue` flow would have.
- Explore subagent dispatch to study pi-subagents' extension surface model was appropriate — claude-haiku-4-5 for a read-only architecture doc exploration, completed in 37s with a thorough summary.

#### What caused friction (agent side)

1. `scope-drift` — when the improvement-round prompt was invoked, I began a generic fallow analysis (full suite, entire architecture doc, trace from `index.ts` outward) instead of recognizing that the prior conversation had already established the target area and goals.
   The user redirected at entry 44: "Use the initial conversation to set the clear goal of what should become easy."
   Impact: ~5 wasted tool calls on generic analysis before the redirect.
   User-caught.
2. `missing-context` — used bare `#NNN` issue references in the architecture doc without checking the project's established convention.
   The user prompted me to check `packages/pi-subagents/docs/architecture/architecture.md`, which uses reference-style links with full URLs.
   Impact: one follow-up commit (`docs(pi-permission-system): use reference-style issue links in roadmap`).
   User-caught.
3. `missing-context` — forgot to `git push` after committing.
   The user had to ask "Everything is committed and pushed?"
   Impact: minor delay, no rework.
   User-caught.
4. `wrong-abstraction` — tried `pnpm fallow:health` (a package-level script alias that doesn't exist in pi-permission-system) instead of `pnpm fallow health` (the root-level fallow command with subcommand).
   Impact: 2 wasted tool calls discovering the correct invocation.

#### What caused friction (user side)

- The improvement-round prompt's commit block had `docs(pi-subagents)` hardcoded instead of using the package name parameter.
  This would have produced wrong commit message scopes for any non-pi-subagents package.
  Fixed in this retro session.

### Diagnostic details

- **Model-performance correlation** — Explore subagent (entry 29) ran on claude-haiku-4-5 for read-only architecture doc exploration; appropriate match for the task.
- **Unused-tool detection** — the `missing-context` around link conventions (friction #2) could have been prevented by grepping the sibling architecture doc before writing links.
  The improvement-discovery skill says to "search sibling packages for the established convention" for code patterns; the same principle applies to doc formatting.

### Changes made

1. Added reference-style link convention rule to `.pi/skills/markdown-conventions/SKILL.md`.
2. Added `git push` to `.pi/prompts/plan-improvements.md` commit step.
3. Fixed hardcoded `docs(pi-subagents)` to `docs($1)` in `.pi/prompts/plan-improvements.md` commit message template.
