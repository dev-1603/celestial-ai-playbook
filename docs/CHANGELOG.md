# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Moved reports and reference docs to `docs/` (CHANGELOG, AUDIT, GAP_REPORT, CLI, PLAYBOOK, etc.)

### Removed

- Deleted legacy `scripts/lib/role-parser.mjs` and `role-adapters.mjs` (gap loop iteration 2)

## [3.0.0] - 2026-07-02

### Added

- `docs/AUDIT.md` — full inventory with scope, altitude, token, and principle-10 tags
- YAML frontmatter on all roles and skills (`name`, `description`, `scope`, `type`, `triggers`, `targets`, `token_budget`)
- JIT skill architecture: `src/skills/performance-tuning/SKILL.md` + `references/` + `scripts/lib/skill-resolver.mjs`
- `ai-playbook generate-rules` orchestrator-workers workflow (`router`, `worker`, `notes`, `synthesize`)
- Global path resolver `scripts/lib/global-paths.mjs` with absolute paths for all 4 IDE targets
- Eval suite `scripts/eval/run-eval.mjs` (router, worker, synthesizer, skill resolver, global-only install)
- `docs/CLI.md` command reference with input/output contracts
- `docs/CHANGELOG.md` and semver alignment (package + manifest → 3.0.0)

### Changed

- Rewrote `backend`, `integration`, `qa` roles to heuristic-only (~800 token budget)
- `ai-playbook install` and `install-all` write **global paths only** — no default project writes
- Consolidated role export to single pipeline (`export-roles.mjs` + `load-roles.mjs`)
- `export-roles` defaults to `--global`; `--project <abs-path>` is opt-in
- `pr-reviewer` command aligned to manifest: `celestial-review-pr`

### Removed

- `sync`, `export`, `switch` CLI commands (replaced by `generate-rules`)
- `export-claude`, `export-copilot`, `export-antigravity` project exports (use `install-all`)
- Legacy role pipeline usage in `install-cursor.mjs` (`role-parser`, `role-adapters` retired from install path)
- Project-directory writes from `install-multi-ide.mjs` and `install-all-ides.mjs`

### Fixed

- Missing `exportRoles` export in `export-roles.mjs`
- `install-all-ides.mjs` positional arg mismatch (now uses `--target` flags)
- Package/manifest version mismatch

## [2.0.0] - prior release

- Initial multi-IDE export pipeline with project sync behavior
