# Celestial AI Playbook — Refactor Audit

Generated: 2026-07-02 (initial) · **Updated: 2026-07-02 (v3.0.0 post-refactor)**

> **Current status:** Global-only install pipeline complete. Project rules via `generate-rules`.  
> For live invariants run `npm run audit:static` + `npm run audit:pipelines` + `npm run audit:commands`.  
> Gap loop iteration 2 closed MINOR debt (legacy files deleted, metrics refreshed below).

## Executive Summary (v3.0.0 — current)

| Metric | Count / Status |
|--------|----------------|
| Total `src/**/*.md` files | **47** (includes `performance-tuning/SKILL.md` + 3 references) |
| Scaffold placeholders (36-line generic) | 25 (deferred content) |
| Rich content files | 22 |
| Roles with YAML frontmatter | **13/13** |
| Competing export pipelines | **0** (legacy `role-parser`/`role-adapters` deleted) |
| Project-directory write sites (default install) | **0** |
| Package / manifest version | **3.0.0** (aligned) |
| Eval + smoke coverage | `eval:all` 17/17; `eval:smoke:phases` 5/5 phases |

---

## Historical Audit (Phase 1 baseline — pre-refactor)

Source files at audit time: **44** markdown modules under `src/`.

### Executive Summary (historical snapshot)

| Metric | Count (at Phase 1) |
|--------|-------------------|
| Total `src/**/*.md` files | 44 |
| Roles with YAML frontmatter | 1/13 |
| Competing export pipelines | 2 |
| Project-directory write sites | 6 (all remediated in v3) |
| Version mismatch | 2.0.0 vs 3.0.0 (now aligned) |

---

## 1. Source Module Inventory

Token estimate = lines × 7.

### 1.1 Roles (`src/roles/`) — type: command, scope: global

| File | Lines | ~Tokens | Altitude | P10 | Frontmatter | Notes |
|------|-------|---------|----------|-----|-------------|-------|
| `backend.md` | 219 | 1,533 | too brittle | no | legacy `@trigger` | Long code examples; rewrite to heuristics |
| `integration.md` | 228 | 1,596 | too brittle | no | legacy | Long code examples; rewrite to heuristics |
| `qa.md` | 206 | 1,442 | too brittle | no | legacy | Long code examples; rewrite to heuristics |
| `ai-ml-specialist.md` | 197 | 1,379 | too brittle | no | legacy | Narrative + examples |
| `data-engineer.md` | 207 | 1,449 | too brittle | no | legacy | Narrative + examples |
| `devops.md` | 201 | 1,407 | too brittle | no | legacy | Narrative + examples |
| `go-engineer.md` | 195 | 1,365 | too brittle | no | legacy | Narrative + examples |
| `dba.md` | 174 | 1,218 | too brittle | no | legacy | Narrative + examples |
| `ui-ux.md` | 179 | 1,253 | too brittle | no | legacy | Narrative + examples |
| `pr-reviewer.md` | 81 | 567 | right altitude | no | YAML | Reference frontmatter schema |
| `system-architect.md` | 85 | 595 | right altitude | no | legacy | Concise heuristics |
| `frontend.md` | 75 | 525 | right altitude | no | legacy | Concise heuristics |
| `end-user.md` | 61 | 427 | right altitude | no | legacy | Concise heuristics |

### 1.2 Skills (`src/skills/`) — type: skill, scope: global

| File | Lines | ~Tokens | Altitude | P10 | Frontmatter | Notes |
|------|-------|---------|----------|-----|-------------|-------|
| `performance-tuning.md` | 20 | 140 | right altitude | no | legacy | Only skill with real content; JIT refactor target |
| `observability.md` | 36 | 252 | too vague | no | legacy | Scaffold — `needs-real-content: deferred` |
| `threat-modeling.md` | 36 | 252 | too vague | no | legacy | Scaffold — deferred |
| `domain-driven-design.md` | 36 | 252 | too vague | no | legacy | Scaffold — deferred |

### 1.3 Base (`src/base/`) — type: rule, scope: global

| File | Lines | ~Tokens | Altitude | P10 | Frontmatter | Notes |
|------|-------|---------|----------|-----|-------------|-------|
| `global-rules.md` | 144 | 1,008 | right altitude | no | legacy | Domain-neutral; trim in Phase 2 |

### 1.4 Architecture (`src/architecture/`) — type: rule, scope: **project-only**

| File | Lines | ~Tokens | Altitude | P10 | Frontmatter | Notes |
|------|-------|---------|----------|-----|-------------|-------|
| `carecaddy.md` | 281 | 1,967 | right altitude | **yes** | legacy | Healthcare vertical — never global-install |
| `control-plane.md` | 185 | 1,295 | right altitude | **yes** | legacy | Celestial auth product — generator input only |
| `core-ecosystem.md` | 173 | 1,211 | right altitude | **yes** | legacy | Celestial ecosystem — generator input only |

### 1.5 Language Rules — scope: global

| File | Lines | ~Tokens | Altitude | P10 | Notes |
|------|-------|---------|----------|-----|-------|
| `typescript.md` | 36 | 252 | too vague | no | Scaffold — deferred |
| `javascript.md` | 36 | 252 | too vague | no | Scaffold — deferred |
| `python-core.md` | 36 | 252 | too vague | no | Scaffold — deferred |
| `go-core.md` | 36 | 252 | too vague | no | Scaffold — deferred |

### 1.6 Framework Rules — scope: global

All 8 files are 36-line scaffolds — `needs-real-content: deferred`.

### 1.7 Design Patterns — scope: global

| File | Lines | ~Tokens | Altitude | Notes |
|------|-------|---------|----------|-------|
| `data-consistency.md` | 20 | 140 | right altitude | Real content (outbox, saga, idempotency) |
| `api-design.md` | 36 | 252 | too vague | Scaffold — deferred |
| `deployment.md` | 36 | 252 | too vague | Scaffold — deferred |
| `event-driven.md` | 36 | 252 | too vague | Scaffold — deferred |
| `resiliency.md` | 36 | 252 | too vague | Scaffold — deferred |

### 1.8 Data Layers & Cloud AI — scope: global

All 6 files are 36-line scaffolds — `needs-real-content: deferred`.

---

## 2. Principle 10 Violations

Product-specific logic must never live in global skills/roles/base or global install targets.

| File | Violation | Remediation |
|------|-----------|-------------|
| `src/architecture/carecaddy.md` | CareCaddy healthcare vertical | Project-rule-generator input only; `scope: project` enforced |
| `src/architecture/control-plane.md` | Celestial Auth Control Plane | Generator input only |
| `src/architecture/core-ecosystem.md` | Celestial core ecosystem | Generator input only |
| `src/base/global-rules.md` | References "Celestial Platform" branding | Acceptable as org-wide base; no product schema |

Architecture files are correctly tagged `scope: project` in manifest but were previously syncable to project `.cursor/rules/` via install — acceptable for generator output, not for global install.

---

## 3. Project-Directory Write Sites (Must Remove/Redirect)

| Location | Function | Writes To | Action |
|----------|----------|-----------|--------|
| `scripts/install-cursor.mjs` | `syncProjectRules()` | `<cwd>/.cursor/rules/*.mdc` | **Remove** — replace with `generate-rules` |
| `scripts/install-multi-ide.mjs` | `exportClaude/Copilot/Antigravity` | `CLAUDE.md`, `.github/copilot-instructions.md`, `.rules/` | **Remove project export** — global only |
| `scripts/export-roles.mjs` | `exportTarget()` default | `<cwd>/.cursor/commands/` etc. | **Default to global paths**; `--project` opt-in |
| `bin/ai-playbook` | `switch` | `.cursorrules`, `.claudecoderules` | **Remove** — use `generate-rules` |
| `bin/ai-playbook` | `export`/`sync` | delegates to sync | **Remove** |
| `scripts/install-all-ides.mjs` | orchestrator | all above when `isProjectContext()` | **Global-only orchestration** |

---

## 4. Competing Export Pipelines

| Pipeline | Entry | Loader | Status |
|----------|-------|--------|--------|
| **New (canonical)** | `export-roles.mjs` | `load-roles.mjs` + frontmatter | Keep — extend with `--global` |
| **Legacy** | ~~`install-cursor.mjs`~~ | ~~`role-parser.mjs` + `role-adapters.mjs`~~ | **Deleted** in v3.0.0 gap iteration 2 |

Known inconsistencies from dual pipelines:
- `pr-reviewer` command: manifest `celestial-review-pr` vs frontmatter `celestial-pr-reviewer`
- `verify-role-exports.mjs` imports missing `exportRoles` function
- `install-all-ides.mjs` passes positional args; `export-roles.mjs` expects `--target`

---

## 5. Script Inventory

| File | Lines | Purpose | Scope Issue |
|------|-------|---------|-------------|
| `bin/ai-playbook` | 325 | CLI router | Project writes via switch/sync |
| `scripts/export-roles.mjs` | 246 | Role export (new) | Defaults to project cwd |
| `scripts/install-cursor.mjs` | 168 | Cursor install | Global + project sync |
| `scripts/install-multi-ide.mjs` | 132 | Multi-IDE rules export | Project-only |
| `scripts/install-all-ides.mjs` | 85 | Orchestrator | Mixed global/project |
| `scripts/lib/cursor-export.mjs` | 124 | Manifest loader, MDC builders | `getProjectRules` for project sync |
| `scripts/lib/frontmatter.mjs` | 291 | YAML parser | OK |
| `scripts/lib/load-roles.mjs` | 133 | Role normalizer | OK |
| `scripts/lib/role-adapters.mjs` | — | — | **Deleted** |
| `scripts/lib/role-parser.mjs` | — | — | **Deleted** |
| `scripts/test-export-pipeline.mjs` | 244 | Integration tests | OK |
| `scripts/verify-frontmatter.mjs` | 131 | Frontmatter unit tests | OK |
| `scripts/verify-role-exports.mjs` | 158 | Role export verify | Broken import |

---

## 6. Scaffold Files Flagged (Deferred Content)

25 files at exactly 36 lines with generic "Domain-Neutral Engineering Assistant" template. Do not install heavy content until authored. Marked in manifest with `contentStatus: scaffold`.

---

## 7. Missing Infrastructure

| Item | Status |
|------|--------|
| `project-rule-generator` | Does not exist — Phase 5 |
| `skill-resolver.mjs` | Does not exist — Phase 3 |
| `CHANGELOG.md` | Does not exist — Phase 7 |
| `playbook.manifest.schema.json` | Referenced but missing |
| Eval suite | Partial (`test-export-pipeline.mjs` only) |

---

## 8. Verification Evidence (Phase 1)

```bash
find src -name '*.md' | wc -l   # → 44
grep -c "needs-real-content" AUDIT.md  # scaffold section documents 25 files
```

Row count in Section 1 tables: 13 + 4 + 1 + 3 + 4 + 8 + 5 + 3 + 3 = **44** ✓
