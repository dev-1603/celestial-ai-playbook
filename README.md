# Celestial AI Playbook

**Organization-wide AI engineering standards** for Cursor — shared across every repo under `Githubrepos/`, without replacing project-specific context.

This repository is the **global layer**: roles, programming languages, frameworks, system design principles, design patterns, and architectural planning guidelines that apply org-wide. Each individual repository adds its **own** rules, skills, and commands for domain logic, product quirks, and team conventions.

---

## What this project is (and is not)

| Scope | Location | Purpose |
|---|---|---|
| **Global (this repo)** | `~/.cursor/` via `ai-playbook install` | Org standards — how we write code, design systems, review PRs, plan architecture |
| **Project (each repo)** | `.cursor/rules/`, `.cursor/skills/`, `.cursor/commands/` in that repo | Product domain, API contracts, naming, deployment, client-specific logic |

```text
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL — celestial-ai-playbook (install once per developer)    │
│  • Base policy (always apply)                                   │
│  • Language rules (TypeScript, Go, Python, JS — file globs)     │
│  • Framework rules (NestJS, React, Vue, SvelteKit…)             │
│  • Design patterns (API design, resiliency, event-driven…)      │
│  • Role commands (/celestial-backend, /celestial-architect…)    │
│  • Workflow skills (observability, performance, DDD, threats)   │
└────────────────────────────┬────────────────────────────────────┘
                             │  ai-playbook sync (per project)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROJECT — e.g. carecaddy-api, payments-service, admin-ui       │
│  • .cursor/rules/        repo-specific rules (commit to git)    │
│  • .cursor/skills/       repo-specific skills                   │
│  • .cursor/commands/     repo-specific slash commands           │
│  • .ai-playbook.json     which architecture overlays to enable  │
│  • AGENTS.md             optional simple project instructions   │
└─────────────────────────────────────────────────────────────────┘
```

**Yes — the global playbook handles variation across repos.** Language and framework rules attach automatically by file type (`**/*.ts`, `**/*.go`, etc.). Role commands are invoked when you need a persona. Project repos layer their own context on top — the two do not conflict.

---

## How variation works across repositories

Different repos need different combinations. The playbook handles this through **composition**, not one monolithic prompt.

### 1. Programming language (automatic)

When you edit files in a repo, Cursor applies only the matching language rule:

| Repo type | Files open | Global rule applied |
|---|---|---|
| NestJS API | `src/users.service.ts` | `celestial-languages-typescript` + `celestial-frameworks-nestjs` |
| Go microservice | `internal/handler.go` | `celestial-languages-go-core` |
| Python ML pipeline | `train.py` | `celestial-languages-python-core` |
| React dashboard | `Dashboard.tsx` | `celestial-languages-typescript` + `celestial-frameworks-react-next` |

No per-repo config needed for languages — globs handle it.

### 2. Role / task (explicit command)

Same repo, different tasks — invoke the right persona:

```text
/celestial-backend      → building an API endpoint
/celestial-review-pr    → reviewing a pull request
/celestial-architect    → writing an RFC or ADR
/celestial-dba          → schema migration
/celestial-qa           → writing E2E tests
```

### 3. Domain / product (project overlay)

Product-specific architecture lives in **project** config, not globally:

```json
// carecaddy-api/.ai-playbook.json
{
  "architecture": ["control-plane", "carecaddy"]
}
```

```json
// generic-saas-api/.ai-playbook.json
{
  "architecture": ["control-plane", "core-ecosystem"]
}
```

Run `ai-playbook sync` — only the architecture overlays listed in that repo's config are copied to `.cursor/rules/`.

### 4. Repo-specific rules (fully separate)

Things that must **never** be global:

```text
my-payment-service/
  .cursor/
    rules/
      stripe-webhooks.mdc       # project only
      pci-compliance.mdc        # project only
    commands/
      deploy-staging.md         # /deploy-staging
    skills/
      payment-reconciliation/
        SKILL.md                # project workflow
```

Commit these to git. They merge with global rules at runtime — Cursor applies Team → Project → User rules together.

---

## Three Cursor primitives (taxonomy)

Everything in the playbook maps to exactly one Cursor mechanism. See [PLAYBOOK.md](./PLAYBOOK.md) for the full manifest.

| Primitive | Count | Global path | When it applies |
|---|---|---|---|
| **Rules** | 27 | `~/.cursor/celestial-playbook/rules/` → sync to project | Standards — always-on, file-scoped, or intelligent |
| **Skills** | 4 | `~/.cursor/skills/celestial-*/` | Deep workflows — observability, performance, DDD, threat modeling |
| **Commands** | 13 | `~/.cursor/commands/celestial-*.md` | Personas — type `/celestial-backend` in chat |

---

## Multi-IDE support

The **same source content** (`src/`) works across **Cursor, Claude, Copilot, and Antigravity**. Only the export format differs.

| IDE / Tool | Export command | Output | Format |
|---|---|---|---|
| **Cursor** | `ai-playbook sync` | `.cursor/rules/*.mdc` | Cursor Rules (frontmatter + markdown) |
| **Claude Code** | `ai-playbook export-claude` | `CLAUDE.md` | Single global markdown file |
| **GitHub Copilot** | `ai-playbook export-copilot` | `.github/copilot-instructions.md` | Repo instructions markdown |
| **Antigravity** | `ai-playbook export-antigravity` | `.rules/*.md` | Plain markdown directory |
| **All** | `ai-playbook install-all` | Rules + roles for all IDEs | Automatic |

### Role exports (all IDEs)

`export-roles` reads `src/roles/*.md`, normalizes each file into a canonical role object, and dispatches to per-IDE renderers. Roles can include optional YAML frontmatter for explicit metadata; files without frontmatter work via fallback defaults.

```bash
ai-playbook export-roles                          # all 4 targets → cwd
ai-playbook export-roles --target cursor          # single target
ai-playbook export-roles --target claude,copilot  # comma-separated
ai-playbook export-roles --project ../my-service  # write into another dir
```

| Target | Output path | Invoke | Format |
|---|---|---|---|
| `cursor` | `.cursor/commands/celestial-*.md` | `/celestial-backend` | Plain markdown command |
| `claude` | `.claude/commands/celestial-*.md` | `/celestial-backend` | YAML frontmatter + markdown |
| `copilot` | `.github/prompts/celestial-*.prompt.md` | `/celestial-backend` | Copilot prompt file |
| `antigravity` | `.agent/presets/celestial-*.md` | Preset picker | Preset frontmatter + markdown |

All generated files contain `<!-- AUTO-GENERATED by celestial-ai-playbook ... -->`. Edit `src/roles/` instead.

**Skills** remain Cursor-only (`~/.cursor/skills/`).

```bash
# Bootstrap (global, once per developer)
ai-playbook install               # Cursor: global commands, skills, rules

# Per-repository (run from each project repo)
ai-playbook sync                  # rules → .cursor/rules/
ai-playbook export-claude         # rules → CLAUDE.md
ai-playbook export-copilot        # rules → .github/copilot-instructions.md
ai-playbook export-antigravity    # rules → .rules/
ai-playbook export-roles          # roles → .cursor/.claude/.github/.agent
ai-playbook install-all           # all of the above
```

### Example: multi-IDE repo setup

```bash
cd ~/Githubrepos/my-service

# Export global rules for all four IDEs
ai-playbook install-all

# Result:
#   .cursor/rules/*.mdc          ← Cursor
#   CLAUDE.md                     ← Claude Code
#   .github/copilot-instructions.md  ← Copilot
#   .rules/*.md                   ← Antigravity
```

Each team member can use their preferred IDE — all share the same org standards.

---

```bash
ai-playbook manifest          # print full taxonomy
```

---

## 6-layer composition model

Rules are composed in strict order. Lower layers never absorb higher layers.

| Layer | Source | Cursor type | Scope |
|---|---|---|---|
| **1 — Base policy** | `src/base/global-rules.md` | Rule (`alwaysApply: true`) | Global |
| **2 — Domain** | `src/domain/` *(planned)* | Rule | Global or project |
| **3 — Product** | `src/architecture/*.md` | Rule | **Project only** (via `.ai-playbook.json`) |
| **4 — Tenant** | *(planned)* | Rule | Project |
| **5 — Environment** | *(planned)* | Rule | Project |
| **6 — Task** | `src/roles/` → Commands, `src/skills/` → Skills | Command / Skill | Global |

Supporting layers (also global rules):

- `src/languages/` — TypeScript, JavaScript, Python, Go
- `src/frameworks/` — NestJS, React/Next, Vue/Nuxt, SvelteKit, Express
- `src/design-patterns/` — API design, resiliency, event-driven, data consistency
- `src/data-layers/` — SQL, NoSQL, graph
- `src/cloud-ai/` — AI safety, orchestration, infrastructure

---

## Implementation plan

### Phase 1 — Developer bootstrap (one time)

Each developer on the team:

```bash
git clone git@github.com:your-org/celestial-ai-playbook.git
cd celestial-ai-playbook
./install.sh                  # links ai-playbook CLI globally
ai-playbook install           # writes commands, skills, rules → ~/.cursor/
ai-playbook manifest          # verify taxonomy
```

**Outcome:** All org-wide commands (`/celestial-*`), skills, and rule templates available in every Cursor session.

### Phase 2 — Per-repository setup

In each repo under `Githubrepos/`:

```bash
cd ~/Githubrepos/my-service

# Optional: enable product architecture overlays
cp /path/to/celestial-ai-playbook/.ai-playbook.example.json .ai-playbook.json
# Edit architecture[] for this product

# Copy global rules into the project
ai-playbook sync

# Add repo-specific context (commit these)
mkdir -p .cursor/rules .cursor/commands .cursor/skills
```

**Outcome:** Global standards + project overlays active. Repo-specific rules live in git.

### Phase 3 — Day-to-day usage

| Situation | Action |
|---|---|
| Building a NestJS endpoint | Open `.ts` files (rules auto-attach) + `/celestial-backend` |
| Reviewing a PR | `/celestial-review-pr` |
| Designing a new service | `/celestial-architect` |
| Slow database query | Ask agent to optimize → `celestial-performance-tuning` skill loads |
| Security review | "Run threat modeling" → `celestial-threat-modeling` skill loads |

### Phase 4 — Team maintenance

| Task | Command |
|---|---|
| Add a new global role | `ai-playbook create roles security-engineer` → add to `playbook.manifest.json` as `"type": "command"` → `ai-playbook install` |
| Add a new language standard | Create `src/languages/rust-core.md` → manifest entry with `"type": "rule"` and `"globs": "**/*.rs"` → install + sync |
| Update org base policy | Edit `src/base/global-rules.md` → `ai-playbook install && ai-playbook sync` in active projects |
| Repo-only rule | Create `.cursor/rules/my-rule.mdc` directly in the repo — no playbook change needed |

### Phase 5 — Future (planned layers)

- [ ] `src/domain/` — healthcare, fintech, ecommerce overlays (Layer 2)
- [ ] `src/tenant/` — client-specific constraints (Layer 4)
- [ ] `src/environment/` — prod vs staging rules (Layer 5)
- [ ] CI check — validate manifest matches `src/` files
- [ ] Team Rules import — sync base policy to Cursor Team dashboard

---

## Examples by repository type

### Example A — NestJS backend API (TypeScript)

```text
~/Githubrepos/user-service/
├── .ai-playbook.json          # { "architecture": ["control-plane"] }
├── .cursor/
│   └── rules/
│       ├── celestial-base-global-rules.mdc      ← from sync
│       ├── celestial-languages-typescript.mdc   ← from sync
│       ├── celestial-frameworks-nestjs.mdc      ← from sync
│       ├── celestial-architecture-control-plane.mdc  ← from sync
│       └── user-service-conventions.mdc       ← PROJECT ONLY (in git)
└── src/
    └── users/users.controller.ts
```

**Session:**

```text
You: /celestial-backend
You: Add a PATCH /users/:id endpoint with tenant scoping

Agent context:
  ✓ global-rules (always)
  ✓ typescript rule (file glob)
  ✓ nestjs rule (file glob)
  ✓ control-plane architecture (project sync)
  ✓ user-service-conventions (project rule)
  ✓ backend persona (command)
```

### Example B — React / Next.js frontend

```text
~/Githubrepos/admin-dashboard/
├── .ai-playbook.json          # { "architecture": ["core-ecosystem"] }
├── .cursor/
│   └── rules/
│       ├── celestial-frameworks-react-next.mdc  ← from sync
│       ├── celestial-frameworks-styling-system.mdc
│       └── design-system-tokens.mdc             ← PROJECT ONLY
```

**Session:**

```text
You: /celestial-frontend
You: Build an accessible data table component using our design tokens

Agent context:
  ✓ global-rules + WCAG standards
  ✓ react-next + styling rules (file globs)
  ✓ design-system-tokens (project rule)
  ✓ frontend persona (command)
```

### Example C — Go microservice (different language, same org standards)

```text
~/Githubrepos/notification-worker/
├── .ai-playbook.json          # { "architecture": ["core-ecosystem"] }
├── .cursor/
│   └── rules/
│       ├── celestial-languages-go-core.mdc      ← auto for .go files
│       └── sqs-consumer-patterns.mdc            ← PROJECT ONLY
```

**Session:**

```text
You: /celestial-go
You: Implement a concurrent email dispatcher with context cancellation

Agent context:
  ✓ global-rules (always)
  ✓ go-core rule (file glob — NOT typescript rules)
  ✓ go engineer persona (command)
  ✓ sqs-consumer-patterns (project rule)
```

### Example D — CareCaddy healthcare product (domain overlay)

```text
~/Githubrepos/carecaddy-api/
├── .ai-playbook.json
│   # { "architecture": ["control-plane", "carecaddy"] }
├── .cursor/
│   └── rules/
│       ├── celestial-architecture-carecaddy.mdc  ← HIPAA/PHI overlay
│       └── phi-field-masking.mdc               ← PROJECT ONLY
```

Global playbook stays domain-neutral. CareCaddy-specific compliance is Layer 3 — enabled only for repos that opt in via `.ai-playbook.json`.

### Example E — Repo-specific command (not in global playbook)

```markdown
<!-- .cursor/commands/deploy-staging.md -->
Deploy the current branch to staging:

1. Run `npm run test`
2. Run `npm run build`
3. Run `./scripts/deploy.sh staging`
4. Verify health check at https://staging.example.com/health
```

Type `/deploy-staging` — only exists in this repo. Global `/celestial-devops` covers general DevOps persona; project command covers your exact pipeline.

---

## Project configuration

Copy `.ai-playbook.example.json` to `.ai-playbook.json` in each repo:

```json
{
  "architecture": ["control-plane", "core-ecosystem"],
  "domain": null,
  "activeRole": "backend",
  "outputTargets": [".cursorrules"]
}
```

| Field | Purpose |
|---|---|
| `architecture` | Product overlays to include on `ai-playbook sync` (Layer 3) |
| `domain` | Reserved for future Layer 2 domain overlays |
| `activeRole` | Default role for legacy `ai-playbook switch <role>` |
| `outputTargets` | Legacy flat-file output (`.cursorrules`) — optional |

---

## CLI reference

```bash
# Setup
./install.sh                      # install CLI globally
ai-playbook install               # Cursor: global → ~/.cursor/commands, skills, rules

# Per-project (choose one or more)
ai-playbook sync                  # Cursor: rules → .cursor/rules/
ai-playbook export-claude         # Claude: rules → CLAUDE.md
ai-playbook export-copilot        # Copilot: rules → .github/copilot-instructions.md
ai-playbook export-antigravity    # Antigravity: rules → .rules/
ai-playbook export-roles          # Roles → .cursor/.claude/.github/.agent
  --target <t>                    #   filter to one target (cursor|claude|copilot|antigravity)
  --project <dir>                 #   write into <dir> instead of cwd
ai-playbook verify-roles          # Test role exporters
ai-playbook install-all           # All IDEs at once

# Inspect
ai-playbook manifest              # rules vs skills vs commands taxonomy
ai-playbook list all              # all source components
ai-playbook validate              # check src/ directory structure

# Authoring
ai-playbook create roles "security-engineer"
ai-playbook create skills "event-sourcing"
ai-playbook remove skills "old-skill"

# Legacy (monolithic single-file output)
ai-playbook switch backend        # writes .cursorrules from composed layers
```

---

## Repository structure

```text
celestial-ai-playbook/
├── playbook.manifest.json        # taxonomy: rule | skill | command per component
├── PLAYBOOK.md                   # detailed Cursor integration guide
├── .ai-playbook.example.json     # per-repo config template
├── bin/ai-playbook               # CLI entry point
├── scripts/
│   ├── install-cursor.mjs        # install + sync engine
│   ├── export-roles.mjs          # role export entrypoint (frontmatter-based)
│   └── lib/
│       ├── frontmatter.mjs       # generic YAML frontmatter parser
│       ├── load-roles.mjs        # normalized role loader + schema
│       ├── cursor-export.mjs     # rule/command/skill builders
│       └── role-adapters.mjs     # legacy per-target adapters
└── src/
    ├── base/                     # Layer 1 — global policy
    ├── architecture/             # Layer 3 — product overlays (project-scoped)
    ├── languages/                # Rules — file globs per language
    ├── frameworks/               # Rules — file globs per framework
    ├── design-patterns/          # Rules — intelligent apply
    ├── data-layers/              # Rules — SQL, NoSQL, graph
    ├── cloud-ai/                 # Rules — AI platform standards
    ├── skills/                   # Skills — on-demand workflows
    └── roles/                    # Commands — engineering personas
```

---

## Adding a new global component

1. **Create source file**

   ```bash
   ai-playbook create roles "security-engineer"
   # or manually: src/languages/rust-core.md
   ```

2. **Register in manifest** (`playbook.manifest.json`)

   ```json
   "roles/security-engineer": {
     "type": "command",
     "command": "celestial-security",
     "title": "Security Engineer"
   }
   ```

   ```json
   "languages/rust-core": {
     "type": "rule",
     "globs": "**/*.rs",
     "description": "Rust language standards from Celestial Playbook"
   }
   ```

3. **Install and sync**

   ```bash
   ai-playbook install
   cd ~/Githubrepos/target-repo && ai-playbook sync
   ```

---

## FAQ

**Will global rules conflict with project rules?**  
No. Cursor merges them. Project rules take precedence for repo-specific concerns. Global rules provide the org baseline (security, tenancy, code quality).

**Do I need to sync every repo?**  
Run `ai-playbook sync` once per repo (and again after playbook updates). Commands and skills are global — no sync needed for those.

**What if a repo uses multiple languages?**  
Each language rule uses file globs. Editing a `.go` file activates Go rules; editing `.ts` activates TypeScript rules — in the same repo.

**Should product/domain logic go in this repo?**  
No. Keep product logic in project `.cursor/rules/` or enable a Layer 3 architecture overlay via `.ai-playbook.json`. This repo stays domain-neutral at Layer 1.

**What about repos that don't use Celestial architecture?**  
Use an empty architecture array — you still get global base policy, language rules, framework rules, commands, and skills:

```json
{ "architecture": [] }
```

---

## Related docs

- [PLAYBOOK.md](./PLAYBOOK.md) — Cursor primitive mapping and decision guide
- [playbook.manifest.json](./playbook.manifest.json) — component registry (source of truth)
- [Cursor Rules docs](https://cursor.com/docs/context/rules) — official `.mdc` rule format
- [Cursor Commands](https://cursor.com/docs/agent/chat/commands) — slash command format
