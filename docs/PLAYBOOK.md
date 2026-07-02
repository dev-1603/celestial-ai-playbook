# Celestial AI Playbook — Integration Guide

**v3.0.0** — Global-only install + on-demand project rule generation.

Supports **Cursor**, **Claude Code**, **GitHub Copilot**, and **Antigravity** from one `src/` source of truth.

## Multi-IDE adapter mapping (global install)

| IDE / Tool | CLI command | Global output | Roles output | Skills |
|---|---|---|---|---|
| **Cursor** | `ai-playbook install` | `~/.cursor/celestial-playbook/rules/` | `~/.cursor/commands/` | `~/.cursor/skills/` |
| **Claude Code** | `ai-playbook install-all` | `~/.cursor/celestial-playbook/claude/CLAUDE.md` | `~/.claude/commands/` | — |
| **GitHub Copilot** | `ai-playbook install-all` | `~/.copilot/instructions/celestial-playbook.instructions.md` | `~/.copilot/skills/<name>/SKILL.md` | roles are Skills |
| **Antigravity** | `ai-playbook install-all` | `~/.gemini/config/AGENTS.md` | `~/.gemini/config/skills/<name>/SKILL.md` | roles are Skills |

**Removed in v3:** `sync`, `export-claude`, `export-copilot`, `export-antigravity` (project writes). Use `generate-rules` for project-local rules.

### Project rule generation

Architecture overlays (`src/architecture/*.md`) are **never installed globally**. Select them at generation time:

```bash
ai-playbook generate-rules "$(pwd)" \
  --selectors /architecture/control-plane /architecture/carecaddy /base
```

Output: `.cursor/rules/celestial-generated.mdc` + `.ai-playbook/generate-notes.md`

### Cursor-only: Skills (JIT)

**Skills** install to `~/.cursor/skills/celestial-*/`. Heavy content lives in `references/` and loads on demand via `skill-resolver.mjs`. See [REFRACTOR-LESSONS.md](./REFRACTOR-LESSONS.md).

## Role export pipeline (cross-IDE)

Canonical source: `src/roles/*.md` → YAML frontmatter → `load-roles.mjs` → per-IDE renderers in `export-roles.mjs`.

```bash
ai-playbook export-roles                    # global default (all targets)
ai-playbook export-roles --target cursor    # single target
ai-playbook export-roles --project /abs/path  # opt-in project write
ai-playbook verify-roles                    # run export checks
```

### Role metadata schema

```yaml
---
id: roles/pr-reviewer
kind: role
name: pr-reviewer
title: PR Reviewer
description: Rigorous code review enforcing security isolation performance and coverage
command: celestial-review-pr
scope: global
type: command
triggers: [review, pr, pull request, code review]
token_budget: 800
targets:
  cursor:
    enabled: true
    type: command
  claude:
    enabled: true
    type: command
  copilot:
    enabled: true
    type: prompt
  antigravity:
    enabled: true
    type: preset
---
```

| Field | Type | Default (when absent) |
|---|---|---|
| `id` | string | `roles/<filename>` |
| `kind` | `"role"` | `"role"` |
| `command` | string | `celestial-<filename>` (must match manifest) |
| `scope` | `"global"` \| `"project"` | `"global"` |
| `targets` | object | All IDEs enabled |

## Three Cursor primitives

| Primitive | Global path | When |
|---|---|---|
| **Rules** | `~/.cursor/celestial-playbook/rules/` | Always-on or file-scoped standards |
| **Skills** | `~/.cursor/skills/celestial-*/` | On-demand workflows (JIT references) |
| **Commands** | `~/.cursor/commands/celestial-*.md` | Persona switches |

Run `ai-playbook manifest` for the full taxonomy.

## Quick start

```bash
# Global (once per developer)
./install.sh
ai-playbook install
ai-playbook install-all

# Per project (on demand)
ai-playbook generate-rules "$(pwd)" \
  --selectors /role/backend /language/typescript /base
```

## Verification

```bash
npm run audit:static
bash scripts/audit/find-duplicate-pipelines.sh
bash scripts/audit/list-exported-commands.sh
npm run eval:smoke:phase2   # through phase6
npm run eval:all
```

## Related docs

- [README.md](../README.md) — overview and examples
- [CLI.md](./CLI.md) — command contracts
- [PLAN-DEPENDENCIES.md](./PLAN-DEPENDENCIES.md) — parallel phase schedule
- [MODEL-GUIDANCE.md](./MODEL-GUIDANCE.md) — Frontier vs Fast model tiers
