#!/usr/bin/env node

/**
 * Run smoke-per-command then run-eval sequentially.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));

const steps = [
  ['smoke-per-command.mjs', 'Smoke tests'],
  ['run-eval.mjs', 'E2E eval'],
];

let failed = 0;

for (const [script, label] of steps) {
  console.log(`\n▶ ${label}\n`);
  const r = spawnSync('node', [path.join(EVAL_DIR, script)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log(failed === 0
  ? '\nOK: eval:all complete\n'
  : `\nERROR: eval:all — ${failed} suite(s) failed\n`);
process.exit(failed === 0 ? 0 : 1);
