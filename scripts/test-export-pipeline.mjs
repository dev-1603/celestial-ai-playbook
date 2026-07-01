#!/usr/bin/env node

/**
 * Verification suite for the role export pipeline.
 * Runs all checks in an isolated temp directory, then validates in-repo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
    issues.push(label);
  }
}

function assertThrows(fn, label) {
  try {
    fn();
    console.log(`  ❌ ${label} (did not throw)`);
    failed++;
    issues.push(`${label} — expected error but none thrown`);
  } catch (e) {
    console.log(`  ✅ ${label} → ${e.message.split('\n')[0].slice(0, 80)}`);
    passed++;
  }
}

// ── Test 1: Load roles — frontmatter vs fallback ─────────────────────

console.log('\n═══ Test 1: Role loading (frontmatter vs fallback) ═══\n');

const { loadRoles, ROLE_SCHEMA } = await import('./lib/load-roles.mjs');
const rolesDir = path.join(REPO_ROOT, 'src', 'roles');
const roles = loadRoles(rolesDir);

assert(roles.length === 13, `Loaded ${roles.length} roles (expected 13)`);

// pr-reviewer has frontmatter
const pr = roles.find(r => r.id === 'roles/pr-reviewer');
assert(pr !== undefined, 'pr-reviewer role found');
assert(pr.title === 'PR Reviewer', `pr-reviewer title from frontmatter: "${pr.title}"`);
assert(pr.description === 'Rigorous code review enforcing security isolation performance and coverage',
  `pr-reviewer description from frontmatter`);
assert(pr.command === 'celestial-pr-reviewer', `pr-reviewer command: ${pr.command}`);
assert(pr.targets.cursor.type === 'command', `pr-reviewer cursor type from frontmatter: "${pr.targets.cursor.type}"`);
assert(pr.targets.copilot.type === 'prompt', `pr-reviewer copilot type from frontmatter: "${pr.targets.copilot.type}"`);
assert(pr.targets.antigravity.type === 'preset', `pr-reviewer antigravity type from frontmatter: "${pr.targets.antigravity.type}"`);

// backend has NO frontmatter — all fallback
const be = roles.find(r => r.id === 'roles/backend');
assert(be !== undefined, 'backend role found');
assert(be.kind === 'role', `backend kind fallback: "${be.kind}"`);
assert(be.name === 'backend', `backend name fallback: "${be.name}"`);
assert(be.command === 'celestial-backend', `backend command fallback: "${be.command}"`);
assert(be.scope === 'global', `backend scope fallback: "${be.scope}"`);
assert(be.targets.cursor.enabled === true, 'backend cursor.enabled fallback: true');
assert(be.targets.copilot.type === 'prompt', `backend copilot.type fallback: "${be.targets.copilot.type}"`);
assert(be.description.length > 0, `backend description fallback extracted: "${be.description}"`);

// ── Test 2: Renderers produce correct format ─────────────────────────

console.log('\n═══ Test 2: Renderers produce correct output ═══\n');

const { render } = await import('./export-roles.mjs');

const cursorOut = render('cursor', pr);
assert(cursorOut.includes('AUTO-GENERATED'), 'Cursor output has generated notice');
assert(cursorOut.includes('# PR Reviewer'), 'Cursor output has title heading');
assert(cursorOut.includes('Adopt the **PR Reviewer**'), 'Cursor output has instruction intro');

const claudeOut = render('claude', pr);
assert(claudeOut.startsWith('---'), 'Claude output starts with frontmatter fence');
assert(claudeOut.includes('disable-model-invocation: true'), 'Claude output has disable-model-invocation');
assert(claudeOut.includes('description: "Rigorous code review'), 'Claude output has description in frontmatter');

const copilotOut = render('copilot', pr);
assert(copilotOut.includes('name: celestial-pr-reviewer'), 'Copilot output has name field');
assert(copilotOut.includes('agent: agent'), 'Copilot output has agent field');

const antiOut = render('antigravity', pr);
assert(antiOut.includes('type: preset'), 'Antigravity output has type: preset');
assert(antiOut.includes(`title: "PR Reviewer"`), 'Antigravity output has title');

// ── Test 3: Export to temp directory — all targets ───────────────────

console.log('\n═══ Test 3: Export to temp directory (all targets) ═══\n');

const tmpDir = path.join(REPO_ROOT, '.tmp-export-test');
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const { exportTarget } = await import('./export-roles.mjs');

const expectedPaths = {
  cursor:      ['.cursor', 'commands'],
  claude:      ['.claude', 'commands'],
  copilot:     ['.github', 'prompts'],
  antigravity: ['.agent', 'presets'],
};

for (const target of ['cursor', 'claude', 'copilot', 'antigravity']) {
  const result = exportTarget(target, roles, tmpDir);
  const expDir = path.join(tmpDir, ...expectedPaths[target]);
  
  assert(fs.existsSync(expDir), `${target}: output directory created at ${expectedPaths[target].join('/')}`);
  assert(result.written.length === 13, `${target}: wrote ${result.written.length} files (expected 13)`);
  
  // Spot-check pr-reviewer file exists
  const prFile = result.written.find(w => w.command === 'celestial-pr-reviewer');
  assert(prFile !== undefined, `${target}: pr-reviewer file in results`);
  assert(fs.existsSync(prFile.outPath), `${target}: pr-reviewer file exists on disk`);
  
  // Verify generated notice in content
  const content = fs.readFileSync(prFile.outPath, 'utf-8');
  assert(content.includes('AUTO-GENERATED'), `${target}: file contains generated notice`);
}

// Verify no unrelated files were created
const topLevelEntries = fs.readdirSync(tmpDir);
const expectedTopLevel = new Set(['.cursor', '.claude', '.github', '.agent']);
const unexpected = topLevelEntries.filter(e => !expectedTopLevel.has(e));
assert(unexpected.length === 0, `No unrelated files created (found: ${unexpected.length > 0 ? unexpected.join(', ') : 'none'})`);

// ── Test 4: Single target only creates its own directory ─────────────

console.log('\n═══ Test 4: Single target isolation ═══\n');

const singleDir = path.join(REPO_ROOT, '.tmp-export-single');
if (fs.existsSync(singleDir)) fs.rmSync(singleDir, { recursive: true });
fs.mkdirSync(singleDir, { recursive: true });

exportTarget('cursor', roles, singleDir);

assert(fs.existsSync(path.join(singleDir, '.cursor', 'commands')), 'cursor dir created');
assert(!fs.existsSync(path.join(singleDir, '.claude')), '.claude NOT created');
assert(!fs.existsSync(path.join(singleDir, '.github')), '.github NOT created');
assert(!fs.existsSync(path.join(singleDir, '.agent')), '.agent NOT created');

// ── Test 5: Malformed frontmatter fails clearly ──────────────────────

console.log('\n═══ Test 5: Malformed frontmatter rejection ═══\n');

const { parseMarkdown } = await import('./lib/frontmatter.mjs');

assertThrows(
  () => parseMarkdown('---\nkey: "unclosed\n---\nbody', { sourcePath: 'test-malformed.md' }),
  'Unclosed quoted value is rejected'
);

assertThrows(
  () => parseMarkdown('---\nthis is not yaml\n---\nbody', { sourcePath: 'test-invalid.md' }),
  'Line without colon is rejected'
);

assertThrows(
  () => parseMarkdown('---\nkey: value\nkey: dupe\n---\nbody', { sourcePath: 'test-dupe.md' }),
  'Duplicate key is rejected'
);

// ── Test 6: kind validation ──────────────────────────────────────────

console.log('\n═══ Test 6: Schema validation ═══\n');

const badRolesDir = path.join(REPO_ROOT, '.tmp-bad-roles');
if (fs.existsSync(badRolesDir)) fs.rmSync(badRolesDir, { recursive: true });
fs.mkdirSync(badRolesDir, { recursive: true });

fs.writeFileSync(path.join(badRolesDir, 'bad-kind.md'), '---\nkind: skill\n---\n# Test\n');
assertThrows(
  () => loadRoles(badRolesDir),
  'kind: "skill" rejected (must be "role")'
);

// Cleanup bad roles
fs.rmSync(badRolesDir, { recursive: true });

fs.mkdirSync(badRolesDir, { recursive: true });
fs.writeFileSync(path.join(badRolesDir, 'Bad_Name.md'), '# Test\n');
assertThrows(
  () => loadRoles(badRolesDir),
  'Non-kebab-case command rejected (Bad_Name → celestial-Bad_Name)'
);
fs.rmSync(badRolesDir, { recursive: true });

// ── Test 7: Determinism — run twice, compare ─────────────────────────

console.log('\n═══ Test 7: Output determinism ═══\n');

const det1 = path.join(REPO_ROOT, '.tmp-det1');
const det2 = path.join(REPO_ROOT, '.tmp-det2');
for (const d of [det1, det2]) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true });
  fs.mkdirSync(d, { recursive: true });
}

exportTarget('cursor', roles, det1);
exportTarget('cursor', roles, det2);

const files1 = fs.readdirSync(path.join(det1, '.cursor', 'commands')).sort();
const files2 = fs.readdirSync(path.join(det2, '.cursor', 'commands')).sort();
assert(JSON.stringify(files1) === JSON.stringify(files2), 'Same filenames across runs');

let contentMatch = true;
for (const f of files1) {
  const c1 = fs.readFileSync(path.join(det1, '.cursor', 'commands', f), 'utf-8');
  const c2 = fs.readFileSync(path.join(det2, '.cursor', 'commands', f), 'utf-8');
  if (c1 !== c2) { contentMatch = false; break; }
}
assert(contentMatch, 'Identical file contents across runs (deterministic)');

// ── Cleanup ──────────────────────────────────────────────────────────

for (const d of [tmpDir, singleDir, det1, det2]) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true });
}

// ── Summary ──────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
console.log('═══════════════════════════════════════════\n');

if (issues.length) {
  console.log('Issues found:');
  issues.forEach(i => console.log(`  • ${i}`));
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);
