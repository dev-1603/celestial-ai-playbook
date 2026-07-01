#!/usr/bin/env bash
# Compare manifest command names vs role frontmatter commands.
# GAP 3 — surfaces drift like celestial-review-pr vs celestial-pr-reviewer.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MANIFEST="$REPO_ROOT/playbook.manifest.json"
ROLES_DIR="$REPO_ROOT/src/roles"
ERRORS=0

fail() { echo "ERROR: $1"; ERRORS=$((ERRORS + 1)); }
pass() { echo "OK: $1"; }

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq required"
  exit 1
fi

# List manifest command entries for roles/*
while IFS= read -r key; do
  manifest_cmd=$(jq -r --arg k "$key" '.components[$k].command // empty' "$MANIFEST")
  role_file="$ROLES_DIR/$(basename "$key").md"
  if [ ! -f "$role_file" ]; then
    fail "missing role file for manifest key $key"
    continue
  fi
  # Extract command: from YAML frontmatter
  frontmatter_cmd=$(awk '/^---$/{p=1;next} p&&/^---$/{exit} p&&/^command:/{sub(/^command:[[:space:]]*/,"");print;exit}' "$role_file" || true)
  if [ -z "$frontmatter_cmd" ]; then
    echo "WARN: $key has no frontmatter command (fallback: celestial-$(basename "$key"))"
    continue
  fi
  if [ "$manifest_cmd" != "$frontmatter_cmd" ]; then
    fail "$key: manifest=$manifest_cmd frontmatter=$frontmatter_cmd"
  else
    pass "$key → $manifest_cmd"
  fi
done < <(jq -r '.components | keys[] | select(startswith("roles/"))' "$MANIFEST")

# Scan for known bad alias anywhere in src/roles
if grep -rq 'celestial-pr-reviewer' "$ROLES_DIR" 2>/dev/null; then
  fail "stale command name celestial-pr-reviewer found in src/roles/"
else
  pass "no celestial-pr-reviewer drift in src/roles/"
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "OK: All exported commands aligned"
  exit 0
else
  echo "ERROR: $ERRORS command alignment issue(s)"
  exit 1
fi
