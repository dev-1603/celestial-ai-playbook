#!/usr/bin/env node

/**
 * Eval suite — known-input test cases for routing, generation, install behavior.
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { routeSelectors, MAX_SELECTORS } from '../project-rule-generator/router.mjs';
import { runWorkers, SUMMARY_CHAR_BUDGET } from '../project-rule-generator/worker.mjs';
import { synthesizeRules, validateRuleOutput } from '../project-rule-generator/synthesize.mjs';
import { generateRules } from '../project-rule-generator/index.mjs';
import { resolveSkill, estimateTokens } from '../lib/skill-resolver.mjs';
import { exportRoles } from '../export-roles.mjs';
import { getGlobalPaths } from '../lib/global-paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\n═══ Eval: Router ═══\n');

test('parses role selector', () => {
  const r = routeSelectors(['/role/system-architect', '/language/typescript'], REPO_ROOT);
  assert.equal(r.ok, true);
  assert.ok(r.modules.some(m => m.componentKey === 'roles/system-architect'));
  assert.ok(r.modules.some(m => m.componentKey === 'languages/typescript'));
});

test('parses alias selectors', () => {
  const r = routeSelectors(['/system-architect', '/typescript', '/vue-nuxt', '/rest', '/base'], REPO_ROOT);
  assert.equal(r.ok, true);
  assert.equal(r.modules.length, 5);
});

test('rejects unknown selector', () => {
  const r = routeSelectors(['/role/nonexistent-role-xyz'], REPO_ROOT);
  assert.equal(r.ok, false);
});

test('rejects too many selectors', () => {
  const many = Array.from({ length: MAX_SELECTORS + 1 }, (_, i) => `/role/backend-${i}`);
  const r = routeSelectors(many, REPO_ROOT);
  assert.equal(r.ok, false);
  assert.ok(r.errors[0].includes('MAX_SELECTORS'));
});

console.log('\n═══ Eval: Worker ═══\n');

test('worker summary within budget', () => {
  const routed = routeSelectors(['/role/backend'], REPO_ROOT);
  const results = runWorkers(routed.modules, REPO_ROOT);
  assert.equal(results[0].ok, true);
  assert.ok(results[0].summaryChars <= SUMMARY_CHAR_BUDGET);
});

test('missing reference returns marker', () => {
  const results = runWorkers([{
    componentKey: 'roles/does-not-exist',
    selector: '/role/does-not-exist',
    type: 'command',
  }], REPO_ROOT);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].error, 'MISSING_REFERENCE');
});

console.log('\n═══ Eval: Synthesizer ═══\n');

test('validates output schema', () => {
  const good = '---\nalwaysApply: true\ndescription: test\n---\n\n## Generated Rules\n\ncontent';
  assert.equal(validateRuleOutput(good).ok, true);
  const bad = '# no frontmatter\n\n## Generated Rules';
  assert.equal(validateRuleOutput(bad).ok, false);
});

console.log('\n═══ Eval: Generate Rules E2E ═══\n');

test('generates project rules end-to-end', () => {
  const tmpProject = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-eval-proj-'));
  const result = generateRules({
    projectDir: tmpProject,
    selectors: ['/system-architect', '/typescript', '/vue-nuxt', '/rest', '/base'],
  });
  assert.equal(result.ok, true);
  assert.ok(fs.existsSync(result.outPath));
  assert.ok(fs.existsSync(result.notesPath));
  const content = fs.readFileSync(result.outPath, 'utf-8');
  assert.ok(content.includes('## Generated Rules'));
  assert.ok(content.length < 50000, 'output not leaking full raw references');
  fs.rmSync(tmpProject, { recursive: true, force: true });
});

console.log('\n═══ Eval: Skill Resolver Token Budget ═══\n');

test('metadata load cheaper than skill load', () => {
  const meta = resolveSkill(REPO_ROOT, 'skills/performance-tuning', { level: 'metadata' });
  const skill = resolveSkill(REPO_ROOT, 'skills/performance-tuning', { level: 'skill' });
  assert.ok(estimateTokens(meta) < estimateTokens(skill));
});

console.log('\n═══ Eval: Global Install (no project writes) ═══\n');

test('export-roles global does not write to project cwd', () => {
  const tmpHome = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-eval-home-'));
  const tmpProject = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-eval-proj2-'));
  const before = fs.readdirSync(tmpProject);

  exportRoles({ targets: ['cursor'], global: true, homeDir: tmpHome, projectDir: tmpProject, repoRoot: REPO_ROOT });

  const after = fs.readdirSync(tmpProject);
  assert.deepEqual(before, after, 'project dir unchanged');

  const paths = getGlobalPaths(tmpHome);
  assert.ok(fs.existsSync(paths.cursor.commands));
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(tmpProject, { recursive: true, force: true });
});

console.log(`\n${failed === 0 ? '✅' : '❌'} Eval complete: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
