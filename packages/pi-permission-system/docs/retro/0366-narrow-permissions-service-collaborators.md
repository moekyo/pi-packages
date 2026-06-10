---
issue: 366
issue_title: "Narrow `LocalPermissionsService` collaborators to interfaces"
---

# Retro: #366 — Narrow `LocalPermissionsService` collaborators to interfaces

## Stage: Planning (2026-06-10T00:00:00Z)

### Session summary

Produced the implementation plan for narrowing `LocalPermissionsService`'s three constructor parameters from concrete classes (`PermissionManager`, `SessionRules`, `ToolInputFormatterRegistry`) to abstractions.
Confirmed against the source that the design is fully prescribed by both the issue and the Phase 5 Track C roadmap in `docs/architecture/architecture.md`: reuse `ScopedPermissionManager`, `Pick<SessionRules, "getRuleset">`, and a new `{ register }` interface.
Skipped the `ask-user` gate — the proposed change is unambiguous.

### Observations

- The change is type-only and non-breaking; `src/index.ts` (the sole production construction site) needs no edit because the concrete instances structurally satisfy the narrower parameter types.
- New write-side interface `ToolInputFormatterRegistrar` mirrors the existing read-side `ToolInputFormatterLookup` in `tool-input-formatter-registry.ts`; the concrete registry gains it in its `implements` clause.
- ISP tradeoff noted: `ScopedPermissionManager` declares 5 methods but the service calls only 2.
  Reuse is a deliberate, documented decision (consistency with `PermissionSession` / `PermissionResolver`); the testability goal still holds because the test mock factory return type is a `Pick` of the two exercised methods.
- Planned as a single Red→Green→Commit cycle (`refactor:`): removing the three `as unknown as` casts in `permissions-service.test.ts` fails `tsc` until the constructor types are narrowed, so the test simplification and production narrowing land in one commit.
- The roadmap `✓ complete` mark on Track C Step 5 is deferred to ship time, per the package skill — not part of this plan's commits.
