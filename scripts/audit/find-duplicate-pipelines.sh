#!/usr/bin/env bash
# Detect competing role-export pipelines in install paths.
# GAP 3 — discovery efficiency. Exit 0 if clean, 1 if conflict found.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ERRORS=0

fail() { echo "ERROR: $1"; ERRORS=$((ERRORS + 1)); }
pass() { echo "OK: $1"; }

# fail if legacy pipeline files still exist on disk
for f in scripts/lib/role-parser.mjs scripts/lib/role-adapters.mjs; do
  if [ -f "$REPO_ROOT/$f" ]; then
    fail "legacy file still exists: $f (delete or retire)"
  else
    pass "legacy removed: $f"
  fi
done

# Install scripts must not import legacy pipeline
for f in scripts/install-cursor.mjs scripts/install-all-ides.mjs; do
  if grep -qE 'role-parser|role-adapters|collectRoles' "$REPO_ROOT/$f" 2>/dev/null; then
    fail "$f imports legacy role-parser/role-adapters pipeline"
  else
    pass "$f uses canonical pipeline only"
  fi
done

# Canonical pipeline must be present in install-cursor
if grep -q 'exportRoles' "$REPO_ROOT/scripts/install-cursor.mjs"; then
  pass "install-cursor.mjs uses exportRoles"
else
  fail "install-cursor.mjs missing exportRoles"
fi

# Both pipelines active if install-cursor imports BOTH exportRoles AND role-parser
if grep -q 'exportRoles' "$REPO_ROOT/scripts/install-cursor.mjs" && \
   grep -qE 'role-parser|role-adapters' "$REPO_ROOT/scripts/install-cursor.mjs"; then
  fail "DUAL PIPELINE: install-cursor imports both exportRoles and legacy adapters"
fi

# export-roles.mjs must export exportRoles function
if grep -q 'export function exportRoles' "$REPO_ROOT/scripts/export-roles.mjs"; then
  pass "export-roles.mjs exports exportRoles"
else
  fail "export-roles.mjs missing export function exportRoles"
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "OK: No duplicate pipelines detected"
  exit 0
else
  echo "ERROR: $ERRORS duplicate pipeline issue(s) found"
  exit 1
fi
