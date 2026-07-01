# Model Guidance — Multi-Phase Refactor Execution

No model-selection guidance existed during Phases 1–7 (GAP_REPORT §5). Use this table when planning or executing future multi-phase work.

## Tier definitions

| Tier | Product examples | When to use |
|------|------------------|-------------|
| **Frontier** | Claude Opus, GPT-5 (reasoning tier) | Judgment, trade-offs, architecture, ambiguous requirements |
| **Fast** | Composer, Cursor Auto (execution tier) | Deterministic transforms, grep-driven fixes, test-defined correctness |

## Phase type → model tier

| Phase type | Model tier | Product | Rationale |
|------------|------------|---------|-----------|
| Audit inventory (scope/altitude/P10) | **Frontier** | Opus / GPT-5 | Heuristic judgment; static scan only covers syntax |
| Orchestrator-workers architecture design | **Frontier** | Opus / GPT-5 | Structural decisions, worker isolation contracts |
| Dependency planning | **Frontier** | Opus / GPT-5 | False vs real dependencies need code-path reasoning |
| Narrative → heuristic content rewrite | **Frontier** | Opus / GPT-5 | Token budget and altitude are judgment calls |
| Frontmatter migration (schema known) | **Fast** | Composer / Auto | Schema fixed; script applies template |
| Directory layout migration (pattern known) | **Fast** | Composer / Auto | Follow `docs/REFRACTOR-LESSONS.md` |
| Pipeline removal (grep-identified sites) | **Fast** | Composer / Auto | `scripts/audit/static-scan.mjs` defines targets |
| CLI scripting + smoke tests | **Fast** | Composer / Auto | Test-defined correctness |
| Documentation (lessons, dependencies) | **Fast** | Composer / Auto | Summarize verified facts |

## Handoff rules

1. **Frontier produces spec** — audit table, DAG, file layout, acceptance criteria.
2. **Fast executes spec** — scripts, migrations, tests; does not reinterpret altitude or scope.
3. **Frontier reviews diff** — only when fast tier touches `src/roles`, `src/skills`, `src/base`, or install paths.
4. **Fast verifies** — run `npm run audit:static` and `npm run eval:all`; evidence is script output, not narration.

## Anti-patterns

| Anti-pattern | Why |
|--------------|-----|
| Frontier re-auditing with narrative when static scan suffices | Wastes tokens; use `scripts/audit/static-scan.mjs` |
| Fast tier rewriting role heuristics without spec | Risks wrong altitude; needs frontier-authored bullet list |
| Same path edited in two phases without layout freeze | Caused Phase 2/3 skill overlap; see `docs/REFRACTOR-LESSONS.md` |
| Skipping verify script because E2E eval passed | Per-phase smokes (`verify-frontmatter`, etc.) catch regressions eval omits |

## Commands for fast-tier verification

```bash
npm run audit:static              # structural invariant checks (mjs)
bash scripts/audit/find-duplicate-pipelines.sh
bash scripts/audit/list-exported-commands.sh
npm run eval:smoke:phase2         # Phase 2 — frontmatter
npm run eval:smoke:phase3         # Phase 3 — skill resolver
npm run eval:smoke:phase4         # Phase 4 — global install
npm run eval:smoke:phase5         # Phase 5 — generator
npm run eval:smoke:phase6         # Phase 6 — CLI ACI
npm run eval:all                  # smoke + E2E
```
