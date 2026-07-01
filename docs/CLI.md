# CLI Reference

Single-responsibility commands for the Celestial AI Playbook orchestrator.

| Command | Purpose | Input | Success Output | Failure Output |
|---------|---------|-------|----------------|----------------|
| `install` | Global Cursor rules/skills/commands | none | `OK: Global install complete` | `ERROR: ...` exit 1 |
| `install-all [targets]` | Global install all IDEs | optional target list | `OK: All global installs complete` | `ERROR: Some installs failed` |
| `generate-rules <abs-path> --selectors ...` | Project-local rule generation | absolute project path + selectors (max 8) | `OK: Project rules generated` + JSON | `ERROR: router/synthesize failed` |
| `export-roles [--target t] [--project abs]` | Export role commands | `--global` default; `--project` opt-in | `OK: N file(s) written` | `ERROR: Unknown target` |
| `manifest` | Show taxonomy | none | taxonomy listing + `OK:` | — |
| `validate` | Check src/ structure | none | `OK: Validation passed` | `ERROR: Validation failed` |
| `list [category]` | List components | optional category | `OK: List complete` | — |
| `create/remove` | Scaffold/delete components | category + name | `OK: ...` | `ERROR: ...` |
| `verify-*` | Run test suites | none | all checks pass | failed count |
| `eval` | Full eval suite | none | pass count | fail count |

## Removed Commands (use replacements)

| Removed | Replacement |
|---------|-------------|
| `sync`, `export` | `generate-rules <abs-path> --selectors ...` |
| `switch` | `generate-rules <abs-path> --selectors /role/x /base` |
| `export-claude/copilot/antigravity` | `install-all` |

## Path Discipline

- All `generate-rules` project paths must be **absolute**
- Global installs write only under `$HOME/.cursor/`, `$HOME/.claude/`, `$HOME/.agent/`, `$HOME/.cursor/celestial-playbook/`
- Project writes limited to `<project>/.ai-playbook/generate-notes.md` and `<project>/.cursor/rules/celestial-generated.mdc`
