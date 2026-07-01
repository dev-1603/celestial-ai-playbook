# Celestial AI Playbook

**Organization-wide AI engineering standards** for Cursor, Claude Code, GitHub Copilot, and Antigravity — shared across every repo under `Githubrepos/`, without baking product-specific logic into the global library.

**Version 3.0.0** — global-only install pipeline with on-demand project rule generation.

This repository is the **global layer**: roles, languages, frameworks, design patterns, and base policy. Each project repo adds its **own** rules, skills, and commands for domain logic, product quirks, and team conventions.

---

## What this project is (and is not)

| Scope | Location | Purpose |
|---|---|---|
| **Global (this repo)** | `~/.cursor/`, `~/.claude/`, `~/.cursor/celestial-playbook/` via `ai-playbook install` | Org standards — how we write code, design systems, review PRs |
| **Project (each repo)** | `.cursor/rules/celestial-generated.mdc` + hand-authored `.cursor/rules/` | Product domain, architecture overlays, API contracts, deployment |

```text
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL — celestial-ai-playbook (install once per developer)    │
│  • Base policy, language/framework/pattern rules                │
│  • Role commands (/celestial-backend, /celestial-architect…)    │
│  • Workflow skills (observability, performance, DDD, threats)   │
│  Installed to ~/.cursor/ — never copied into project by default │
└────────────────────────────┬────────────────────────────────────┘
                             │  ai-playbook generate-rules (on demand)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROJECT — e.g. carecaddy-api, payments-service, admin-ui       │
│  • .cursor/rules/celestial-generated.mdc  ← composed selectors  │
│  • .ai-playbook/generate-notes.md         ← worker audit trail  │
│  • .cursor/rules/*.mdc                    ← hand-authored (git)   │
│  • .cursor/skills/                        ← project workflows   │
│  • .cursor/commands/                      ← project commands    │
└─────────────────────────────────────────────────────────────────┘
```

**Composition, not monoliths.** Language rules attach by file glob. Role commands switch persona. Project rules are **generated** from selectors (`/role/backend`, `/typescript`, `/base`, `/architecture/carecaddy`) — not synced wholesale from global.

---

## Quick start

### One-time (per developer)

```bash
git clone git@github.com:your-org/celestial-ai-playbook.git
cd celestial-ai-playbook
./install.sh                  # links ai-playbook CLI globally
ai-playbook install           # global Cursor: rules, skills, commands → ~/.cursor/
ai-playbook install-all       # global: Cursor + Claude + Copilot + Antigravity
ai-playbook manifest          # verify taxonomy
```

### Per project (on demand)

```bash
cd ~/Githubrepos/my-service

# Generate project-local rules from selectors (absolute path required)
ai-playbook generate-rules "$(pwd)" \
  --selectors /role/backend /language/typescript /frameworks/nestjs /base

# Result:
#   .cursor/rules/celestial-generated.mdc
#   .ai-playbook/generate-notes.md
```

Add hand-authored project rules directly under `.cursor/rules/` and commit to git.

---

## How variation works across repositories

### 1. Programming language (automatic via global rules)

When you edit files, Cursor applies matching global rules (installed under `~/.cursor/celestial-playbook/rules/`):

| Repo type | Files open | Global rules |
|---|---|---|
| NestJS API | `src/users.service.ts` | typescript + nestjs |
| Go microservice | `internal/handler.go` | go-core |
| React dashboard | `Dashboard.tsx` | typescript + react-next |

### 2. Role / task (explicit command)

```text
/celestial-backend      → building an API endpoint
/celestial-review-pr    → reviewing a pull request
/celestial-architect    → writing an RFC or ADR
/celestial-dba          → schema migration
/celestial-qa           → writing E2E tests
```

### 3. Product / architecture overlay (project generation)

Product-specific architecture (`src/architecture/*.md`) is **never installed globally**. Select it at generation time:

```bash
ai-playbook generate-rules "$(pwd)" \
  --selectors /architecture/control-plane /architecture/carecaddy /base
```

### 4. Repo-specific rules (fully separate)

```text
my-payment-service/
  .cursor/
    rules/
      celestial-generated.mdc     # from generate-rules
      stripe-webhooks.mdc         # hand-authored, in git
    commands/
      deploy-staging.md
    skills/
      payment-reconciliation/
        SKILL.md
```

---

## Three primitives (taxonomy)

See [PLAYBOOK.md](docs/PLAYBOOK.md) and `ai-playbook manifest`.

| Primitive | Count | Global path | When it applies |
|---|---|---|---|
| **Rules** | 27 | `~/.cursor/celestial-playbook/rules/` | Standards — always-on or file-scoped |
| **Skills** | 4 | `~/.cursor/skills/celestial-*/` | On-demand workflows (JIT references) |
| **Commands** | 13 | `~/.cursor/commands/celestial-*.md` | Personas — `/celestial-backend` |

---

## Project rule generator (orchestrator-workers)

`generate-rules` composes project-local rules without loading the full playbook into context:

```text
Router  → parse/validate selectors (max 8) against playbook.manifest.json
Worker  → read each module in isolation → condensed summary (~1500 tokens)
Notes   → append summaries to .ai-playbook/generate-notes.md
Synthesis → combine summaries into .cursor/rules/celestial-generated.mdc
```

**Selector examples:**

```bash
--selectors /role/system-architect /language/typescript /frameworks/vue-nuxt /rest /base
--selectors /role/backend /architecture/control-plane
--selectors /system-architect /typescript /vue-nuxt   # aliases supported
```

Prefixes: `/role/`, `/language/`, `/frameworks/`, `/rest`, `/base`, `/architecture/`, etc.

---

## Multi-IDE support

Same `src/` content, global install targets per IDE:

| IDE | Install | Global output |
|---|---|---|
| **Cursor** | `ai-playbook install` | `~/.cursor/commands/`, `~/.cursor/skills/`, `~/.cursor/celestial-playbook/rules/` |
| **Claude Code** | `ai-playbook install-all` | `~/.claude/commands/`, `~/.cursor/celestial-playbook/claude/CLAUDE.md` |
| **GitHub Copilot** | `ai-playbook install-all` | `~/.github/prompts/`, `~/.cursor/celestial-playbook/copilot/copilot-instructions.md` |
| **Antigravity** | `ai-playbook install-all` | `~/.agent/presets/`, `~/.cursor/celestial-playbook/antigravity/rules/` |

Role exports use YAML frontmatter from `src/roles/*.md` via `export-roles` (defaults to global paths):

```bash
ai-playbook export-roles                    # global, all targets
ai-playbook export-roles --target cursor    # single target
ai-playbook export-roles --project /abs/path/to/repo  # opt-in project write
```

Skills use JIT layout — see [REFRACTOR-LESSONS.md](docs/REFRACTOR-LESSONS.md):

```text
src/skills/performance-tuning/
  SKILL.md              # lean heuristics + pointers
  references/           # loaded on demand via skill-resolver
```

---

## 6-layer composition model

| Layer | Source | Type | Scope |
|---|---|---|---|
| **1 — Base** | `src/base/global-rules.md` | Rule | Global |
| **2 — Domain** | `src/domain/` *(planned)* | Rule | Global or project |
| **3 — Product** | `src/architecture/*.md` | Rule | **Project only** (via `generate-rules`) |
| **4 — Tenant** | *(planned)* | Rule | Project |
| **5 — Environment** | *(planned)* | Rule | Project |
| **6 — Task** | `src/roles/`, `src/skills/` | Command / Skill | Global |

Supporting global rules: `languages/`, `frameworks/`, `design-patterns/`, `data-layers/`, `cloud-ai/`.

---

## Day-to-day usage

| Situation | Action |
|---|---|
| Building a NestJS endpoint | Open `.ts` files (global rules auto-attach) + `/celestial-backend` |
| Reviewing a PR | `/celestial-review-pr` |
| Designing a new service | `/celestial-architect` |
| New repo needs org + product context | `ai-playbook generate-rules "$(pwd)" --selectors ...` |
| Slow database query | `celestial-performance-tuning` skill (JIT references) |
| Security review | `celestial-threat-modeling` skill |

---

## Examples by repository type

### NestJS backend API

```bash
cd ~/Githubrepos/user-service
ai-playbook generate-rules "$(pwd)" \
  --selectors /role/backend /language/typescript /frameworks/nestjs \
              /architecture/control-plane /base
```

```text
~/Githubrepos/user-service/
├── .cursor/rules/
│   ├── celestial-generated.mdc           ← generated
│   └── user-service-conventions.mdc      ← project only (git)
└── src/users/users.controller.ts
```

### CareCaddy healthcare (architecture overlay)

```bash
ai-playbook generate-rules "$(pwd)" \
  --selectors /role/backend /architecture/control-plane /architecture/carecaddy /base
```

Global playbook stays domain-neutral. CareCaddy HIPAA/PHI rules are Layer 3 — selected only when explicitly requested.

### Go microservice

```bash
ai-playbook generate-rules "$(pwd)" \
  --selectors /role/go-engineer /language/go-core /base
```

---

## CLI reference

Full contracts: [CLI.md](docs/CLI.md)

```bash
# Global install (once per developer)
ai-playbook install               # Cursor: ~/.cursor/
ai-playbook install-all           # All 4 IDEs, global paths only

# Project rule generation
ai-playbook generate-rules <abs-path> --selectors /role/x /language/y /base

# Role export (global by default)
ai-playbook export-roles [--target cursor|claude|copilot|antigravity] [--project <abs-path>]

# Inspect
ai-playbook manifest
ai-playbook list [category]
ai-playbook validate

# Authoring
ai-playbook create roles security-engineer
ai-playbook remove skills old-skill

# Verification
ai-playbook verify-frontmatter
ai-playbook verify-skill-resolver
ai-playbook verify-roles
ai-playbook eval                  # E2E eval suite
npm run eval:all                  # smoke + E2E
npm run audit:static              # structural invariant checks
```

**Removed in v3** (use replacements above):

| Removed | Replacement |
|---------|-------------|
| `sync`, `export` | `generate-rules <abs-path> --selectors ...` |
| `switch` | `generate-rules` with `/role/<name>` + `/base` |
| `export-claude`, `export-copilot`, `export-antigravity` | `install-all` |

---

## Repository structure

```text
celestial-ai-playbook/
├── playbook.manifest.json        # taxonomy registry (v3.0.0)
├── docs/                         # reports, audits, reference docs
│   ├── CHANGELOG.md
│   ├── AUDIT.md
│   ├── GAP_REPORT.md
│   ├── CLI.md
│   ├── PLAYBOOK.md
│   └── ...
├── bin/ai-playbook               # CLI entry point
├── scripts/
│   ├── install-cursor.mjs        # global Cursor install
│   ├── install-all-ides.mjs      # global multi-IDE install
│   ├── install-multi-ide.mjs     # global rules for Claude/Copilot/Antigravity
│   ├── export-roles.mjs          # role export (frontmatter-based)
│   ├── audit/static-scan.mjs     # reusable invariant checks
│   ├── eval/                     # smoke + E2E eval suites
│   ├── project-rule-generator/   # router, worker, notes, synthesize
│   └── lib/
│       ├── frontmatter.mjs
│       ├── load-roles.mjs
│       ├── skill-resolver.mjs    # JIT metadata → SKILL → references
│       ├── cursor-export.mjs
│       └── global-paths.mjs
└── src/
    ├── base/                     # Layer 1 — global policy
    ├── architecture/             # Layer 3 — project-only overlays
    ├── languages/
    ├── frameworks/
    ├── design-patterns/
    ├── data-layers/
    ├── cloud-ai/
    ├── skills/                   # Skills (flat .md or <slug>/SKILL.md + references/)
    └── roles/                    # Commands — YAML frontmatter
```

---

## Adding a new global component

1. Create source file:

   ```bash
   ai-playbook create roles security-engineer
   ```

2. Register in `playbook.manifest.json`:

   ```json
   "roles/security-engineer": {
     "type": "command",
     "command": "celestial-security",
     "title": "Security Engineer"
   }
   ```

3. Install globally:

   ```bash
   ai-playbook install
   ```

4. For skills with heavy content, use directory layout per [REFRACTOR-LESSONS.md](docs/REFRACTOR-LESSONS.md).

---

## Team maintenance

| Task | Command |
|---|---|
| Update global install after src changes | `ai-playbook install` or `install-all` |
| Refresh project composed rules | `ai-playbook generate-rules "$(pwd)" --selectors ...` |
| Add global role | `create` → manifest → `install` |
| Validate structure | `npm run audit:static && npm run eval:all` |

---

## FAQ

**Will global rules conflict with project rules?**  
No. Cursor merges Team → Project → User rules. Project rules take precedence for repo-specific concerns.

**Do I need to run anything per repo?**  
Global commands and skills work everywhere after `install`. Run `generate-rules` when you want composed project rules (architecture overlays, role context). Hand-author additional `.cursor/rules/*.mdc` as needed.

**Should product/domain logic go in this repo?**  
No. Product logic belongs in project rules or `src/architecture/` (consumed via `generate-rules`, never installed globally).

**What if a repo doesn't use Celestial architecture?**  
Omit architecture selectors — you still get global base, language, framework rules, commands, and skills:

```bash
ai-playbook generate-rules "$(pwd)" --selectors /role/backend /language/typescript /base
```

---

## Related docs

| Doc | Purpose |
|---|---|
| [CLI.md](docs/CLI.md) | Command input/output contracts |
| [PLAYBOOK.md](docs/PLAYBOOK.md) | Cursor primitive mapping |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history |
| [REFRACTOR-LESSONS.md](docs/REFRACTOR-LESSONS.md) | Skill JIT layout pattern |
| [PLAN-DEPENDENCIES.md](docs/PLAN-DEPENDENCIES.md) | Multi-phase refactor DAG |
| [MODEL-GUIDANCE.md](docs/MODEL-GUIDANCE.md) | Frontier vs fast execution tiers |
| [GAP_REPORT.md](docs/GAP_REPORT.md) | Post-refactor gap analysis |
| [docs/README.md](docs/README.md) | Full documentation index |
| [playbook.manifest.json](./playbook.manifest.json) | Component registry |
