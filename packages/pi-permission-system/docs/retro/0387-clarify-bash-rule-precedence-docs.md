---
issue: 387
issue_title: "pi-permission-system: clarify bash rule precedence for broad rules and exceptions"
---

# Retro: #387 — Clarify bash rule precedence for broad rules and exceptions

## Stage: Planning (2026-06-11T00:00:00Z)

### Session summary

Planned a non-breaking docs/config fix for the contradictory bash-rule-precedence documentation.
Confirmed via `src/rule.ts` that the evaluator uses `rules.findLast(...)` (last-match-wins) — a load-bearing, tested invariant — so the defect is in the docs/examples, not the evaluator.
Wrote `packages/pi-permission-system/docs/plans/0387-clarify-bash-rule-precedence-docs.md` enumerating every mis-ordered example site and the single contradictory prose line, and committed it.

### Observations

- The issue framed this as a breaking-vs-non-breaking choice (Option 1 docs fix vs Option 2 evaluator redesign).
  Used `ask_user`; user confirmed Option 1 (non-breaking docs fix).
  Option 2 (most-specific-wins) is recorded as out of scope — it would be a breaking semantic change across all surfaces.
- Inventory of buggy `git status`/`git diff` before `git *` ordering (grep-derived, not memory): `docs/configuration.md` lines ~61, ~211–217, ~443–444; `config/config.example.json` lines ~23–28; `schemas/permissions.schema.json` lines ~87–91.
- The single contradictory prose line is `docs/configuration.md` ~202 ("Use a more specific pattern before it to carve out exceptions").
  Line 188 and `README.md` line 87 already state the rule correctly — leave them untouched.
- Already-correct sites to preserve: the "Restricted Bash Surface" example (`*: deny` first), the schema `markdownDescription` prose (~line 120), and the `path`-surface catch-all note (~line 322).
- No test references `config.example.json` or the schema example block (grep-confirmed); JSON key order is insignificant, so reordering cannot break tests — routed to `/build-plan`, single `docs:` commit.
- Minor decision recorded in the plan: the reordered `git *: ask` line is action-redundant with a surface-wide `*: ask` but pattern-distinct; kept deliberately for pedagogy.
  Not an open question.
