#!/usr/bin/env node

/**
 * Per-command smoke tests — fills eval gaps from GAP_REPORT §3.
 * Additive only; does not modify run-eval.mjs.
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { appendWorkerNotes } from '../project-rule-generator/notes.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'ai-playbook');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function runCli(args) {
  return spawnSync('node', [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

console.log('\n═══ Smoke: CLI contracts (Phase 6) ═══\n');

test('validate exits 0 with OK line', () => {
  const r = runCli(['validate']);
  assert.equal(r.status, 0);
  assert.match(r.stdout + r.stderr, /OK:/);
});

test('sync exits 1 with ERROR (deprecated)', () => {
  const r = runCli(['sync']);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /ERROR:/);
  assert.match(r.stdout + r.stderr, /removed/i);
});

test('switch exits 1 with ERROR (deprecated)', () => {
  const r = runCli(['switch', 'backend']);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /ERROR:/);
  assert.match(r.stdout + r.stderr, /removed/i);
});

test('export-claude exits 1 with ERROR (deprecated)', () => {
  const r = runCli(['export-claude']);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /ERROR:/);
});

console.log('\n═══ Smoke: Version parity (Phase 7) ═══\n');

test('package.json version matches playbook.manifest.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'playbook.manifest.json'), 'utf-8'));
  assert.equal(pkg.version, manifest.version);
});

console.log('\n═══ Smoke: notes.mjs (Phase 5) ═══\n');

test('appendWorkerNotes creates .ai-playbook/generate-notes.md', () => {
  const tmpProject = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-smoke-notes-'));
  try {
    const notesFile = appendWorkerNotes(tmpProject, [{
      ok: true,
      module: 'roles/backend',
      selector: '/role/backend',
      sourcePath: '/fake/path',
      summaryChars: 100,
      withinBudget: true,
      summary: '## Priorities\n\n- tenant scope',
    }]);
    assert.ok(fs.existsSync(notesFile));
    assert.ok(notesFile.endsWith('.ai-playbook/generate-notes.md'));
    const content = fs.readFileSync(notesFile, 'utf-8');
    assert.match(content, /roles\/backend/);
    assert.match(content, /Generation Run/);
  } finally {
    fs.rmSync(tmpProject, { recursive: true, force: true });
  }
});

console.log('\n═══ Smoke: manifest command (Phase 1/6) ═══\n');

test('manifest exits 0 and lists taxonomy', () => {
  const r = runCli(['manifest']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /RULE/);
  assert.match(r.stdout, /SKILL/);
  assert.match(r.stdout, /COMMAND/);
});

console.log(`\n${failed === 0 ? 'OK:' : 'ERROR:'} Smoke — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
