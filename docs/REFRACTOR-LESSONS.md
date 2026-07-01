# Refactor Lessons — Skill Module Pattern

Derived from GAP_REPORT §1 (Phase 2/3 overlap on `src/skills/*.md`).

## What went wrong

Phase 2 added YAML frontmatter to flat `src/skills/*.md` files. Phase 3 then migrated `performance-tuning` to a directory layout, requiring a delete-and-recreate. Three other skills received a second pass only to fix `references:` YAML syntax. **Two phases touched the same paths without a layout freeze.**

## Consolidated pattern (use this going forward)

```
src/skills/<slug>/
  SKILL.md              # lean: frontmatter + heuristics + reference pointers
  references/
    <topic>.md          # heavy content; loaded JIT only
  assets/               # optional binaries/diagrams
  scripts/              # optional automation helpers
```

### SKILL.md frontmatter (required)

```yaml
---
name: celestial-<slug>
description: <one line>
scope: global
type: skill
triggers: [keyword, ...]
token_budget: 400
references: [references/overview.md]   # inline array — parser requires this form
---
```

### Body rules

- Keep SKILL.md under `token_budget`; no reference file content inlined.
- List reference paths in body as pointers (`references/database.md`).
- Use section headers to prepare micro-skill splits (`## Logging`, `## Tracing`) but do not duplicate reference content.

## Sequencing rule for future phases

| Step | Action |
|------|--------|
| 1 | **Choose layout first** — flat `.md` OR `<slug>/SKILL.md` + `references/` |
| 2 | Add frontmatter once, in final location |
| 3 | Move heavy content to `references/` before any install/export wiring |
| 4 | Wire `skill-resolver.mjs` only after layout is stable |

**Never** run a flat-file frontmatter migration on a module scheduled for directory migration in the next phase.

## Resolver contract

Load order (never all at once):

1. `metadata` — manifest entry only
2. `skill` — `SKILL.md` body
3. `reference` — single file from `references/` on explicit request

See `scripts/lib/skill-resolver.mjs` and `scripts/verify-skill-resolver.mjs`.

## Migration from flat file

1. Create `src/skills/<slug>/SKILL.md` with frontmatter + lean body.
2. Move detailed content to `references/*.md`.
3. Delete `src/skills/<slug>.md`.
4. Update `readComponent()` / manifest key if path changed (key stays `skills/<slug>`).
