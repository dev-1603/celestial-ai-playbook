#!/usr/bin/env node
/** Phase 5 smoke — router, worker, notes. Runnable independently. */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { routeSelectors } from '../project-rule-generator/router.mjs';
import { runWorkers, SUMMARY_CHAR_BUDGET } from '../project-rule-generator/worker.mjs';
import { appendWorkerNotes } from '../project-rule-generator/notes.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\n═══ Phase 5 Smoke ═══\n');

test('router parses selectors', () => {
  const r = routeSelectors(['/role/backend', '/base'], REPO_ROOT);
  assert.equal(r.ok, true);
  assert.equal(r.modules.length, 2);
});

test('worker summary within budget', () => {
  const routed = routeSelectors(['/role/backend'], REPO_ROOT);
  const results = runWorkers(routed.modules, REPO_ROOT);
  assert.ok(results[0].summaryChars <= SUMMARY_CHAR_BUDGET);
});

test('notes.mjs writes generate-notes.md', () => {
  const tmp = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-smoke-p5-'));
  try {
    const p = appendWorkerNotes(tmp, [{
      ok: true, module: 'roles/backend', selector: '/role/backend',
      sourcePath: 'x', summaryChars: 10, withinBudget: true, summary: 'test',
    }]);
    assert.ok(fs.existsSync(p));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(failed === 0 ? '\nOK: Phase 5 smoke passed\n' : `\nERROR: Phase 5 smoke — ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
