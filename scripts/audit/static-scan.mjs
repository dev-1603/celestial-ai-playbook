#!/usr/bin/env node

/**
 * Static invariant checks — reusable audit scans (GAP_REPORT §2).
 * Does not replace narrative AUDIT.md inventory.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  OK: ${name}`);
    passed++;
  } else {
    console.log(`  ERROR: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
}

function rg(content, pattern) {
  return new RegExp(pattern, 'm').test(content);
}

console.log('\n═══ Static Audit Scan ═══\n');

// ── Project write sites removed from install path ────────────────────

const installCursor = read('scripts/install-cursor.mjs');
const installAll = read('scripts/install-all-ides.mjs');
const installMulti = read('scripts/install-multi-ide.mjs');
const cli = read('bin/ai-playbook');
const exportRoles = read('scripts/export-roles.mjs');

check('install-cursor: no syncProjectRules', !rg(installCursor, 'syncProjectRules'));
check('install-all-ides: no isProjectContext', !rg(installAll, 'isProjectContext'));
check('legacy role-parser.mjs removed from repo', !fs.existsSync(path.join(REPO_ROOT, 'scripts/lib/role-parser.mjs')));
check('legacy role-adapters.mjs removed from repo', !fs.existsSync(path.join(REPO_ROOT, 'scripts/lib/role-adapters.mjs')));
check('install-cursor: uses exportRoles', rg(installCursor, 'exportRoles'));
check('install-cursor: uses resolveSkill', rg(installCursor, 'resolveSkill'));

// install-multi-ide should write to celestial-playbook global paths, not project CLAUDE.md at cwd
check(
  'install-multi-ide: global celestial-playbook paths',
  rg(installMulti, 'celestial-playbook') && !rg(installMulti, 'process\\.cwd\\(\\)')
);

// export-roles defaults global
check('export-roles: global true by default', rg(exportRoles, 'global: true'));

// CLI deprecated commands
check('cli: sync/export deprecated with ERROR', rg(cli, "case 'sync'") && rg(cli, 'removed'));
check('cli: switch deprecated with ERROR', rg(cli, "case 'switch'") && rg(cli, 'removed'));

// install-all uses --target flags
check(
  'install-all-ides: export-roles uses --target flag',
  rg(installAll, '--target')
);

// exportRoles exported
check('export-roles: exports exportRoles function', rg(exportRoles, 'export function exportRoles'));

// ── Version parity ───────────────────────────────────────────────────

const pkgVersion = JSON.parse(read('package.json')).version;
const manifestVersion = JSON.parse(read('playbook.manifest.json')).version;
check('version: package.json == playbook.manifest.json', pkgVersion === manifestVersion, `${pkgVersion} vs ${manifestVersion}`);

// ── pr-reviewer command alignment ────────────────────────────────────

const prReviewer = read('src/roles/pr-reviewer.md');
const manifest = JSON.parse(read('playbook.manifest.json'));
const manifestCmd = manifest.components['roles/pr-reviewer']?.command;
check(
  'pr-reviewer: frontmatter command == manifest',
  rg(prReviewer, 'command: celestial-review-pr') && manifestCmd === 'celestial-review-pr'
);

// ── Infrastructure exists ──────────────────────────────────────────

const required = [
  'scripts/lib/skill-resolver.mjs',
  'scripts/project-rule-generator/router.mjs',
  'scripts/project-rule-generator/worker.mjs',
  'scripts/project-rule-generator/notes.mjs',
  'scripts/project-rule-generator/synthesize.mjs',
  'docs/CHANGELOG.md',
  'docs/CLI.md',
  'docs/GAP_REPORT.md',
  'docs/AUDIT.md',
];

for (const rel of required) {
  check(`exists: ${rel}`, fs.existsSync(path.join(REPO_ROOT, rel)));
}

// ── Skill JIT layout for performance-tuning ──────────────────────────

check(
  'performance-tuning: directory layout',
  fs.existsSync(path.join(REPO_ROOT, 'src/skills/performance-tuning/SKILL.md')) &&
    !fs.existsSync(path.join(REPO_ROOT, 'src/skills/performance-tuning.md'))
);

// ── Source inventory parity (Phase 1 smoke) ────────────────────────

function countSrcMd(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countSrcMd(p);
    else if (entry.name.endsWith('.md')) n++;
  }
  return n;
}

const srcMdCount = countSrcMd(path.join(REPO_ROOT, 'src'));
check('inventory: src/**/*.md count >= 44', srcMdCount >= 44, `found ${srcMdCount}`);

console.log(`\n${failed === 0 ? 'OK:' : 'ERROR:'} Static scan — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
