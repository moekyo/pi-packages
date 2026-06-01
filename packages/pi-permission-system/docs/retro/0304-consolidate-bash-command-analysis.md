---
issue: 304
issue_title: "Consolidate bash command analysis behind a single parsed representation and a candidate-combination helper"
---

# Retro: #304 — Consolidate bash command analysis

## Stage: Planning (2026-06-01T20:26:00Z)

### Session summary

Issue #304 was created during the planning session for #301 in response to the question "what architectural changes would make this easier?".
While planning the #301 bash command-chain fix, the friction analysis surfaced two structural gaps in the bash permission path: no shared parsed-bash representation (three independent tree-sitter parses) and a duplicated most-restrictive candidate-selection loop across the two bash gates.
The owner chose Beck-style "refactor first, then a trivial fix", so #304 captures the behavior-preserving enabler and #301 becomes a follow-up that builds on it.

### Observations

- Scope was deliberately trimmed from the issue's high-level framing.
  The issue text mentioned a dual-strategy combinator (`first-non-default` / `most-restrictive`); the plan narrows #2 to a result-level `pickMostRestrictive` only, because `first-non-default` lives at the rule level (`evaluateFirst`) one layer below and merging the two layers is out of scope.
  Adding an unused strategy parameter would be a speculative export (fallow would flag it).
- The two bash gates share a most-restrictive core but wrap it in different filters — the path gate's #58 backward-compat ("token matching only the universal default is unrestricted") plus session-coverage, and the external-directory gate's "uncovered = `state !== allow`".
  So `pickMostRestrictive` is the right shared seam; the filters stay gate-specific.
  The external-directory gate is a clean drop-in; the path gate needs care to preserve #58 and loses its deny short-circuit (output-identical, slightly more in-memory `checkPermission` calls).
- `BashProgram` (#1) is honestly the lower-leverage of the two enablers near-term: the two extractors already share the AST walker, so #1's win is cohesion and an extensible seam for #301, not fewer parses.
  Parse-once-and-inject across gates was deferred — it changes gate signatures and drifts into the deferred gate-consolidation enabler (#4).
- Kept the existing extractor exports (`extractTokensForPathRules`, `extractExternalPathsFromBashCommand`) as thin facades over `BashProgram` specifically to avoid rewriting the 900-line `test/bash-external-directory.test.ts` (lift-and-shift / large-test-file rule).
- Risk flagged: moving the parse/walk primitives into `bash-program.ts` to avoid a circular import is the largest single edit; it is mechanical and gated by the unchanged extractor suite + `pnpm run check`.
- Labels available are coarse (no `refactor`/`tech-debt`); filed as `enhancement` + `pkg:pi-permission-system`.

### Diagnostic details

- **Feedback-loop gap analysis** — Two steps (path-gate refactor; cross-module primitive move) are explicitly paired with `pnpm run check` in the plan because they are behavior-preserving moves that the type checker, not the test suite alone, will catch first.
