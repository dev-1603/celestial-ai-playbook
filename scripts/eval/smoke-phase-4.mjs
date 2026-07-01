#!/usr/bin/env node
/** Phase 4 smoke — global install pipeline, no project writes. Runnable independently. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;

for (const [script, label] of [
  ['../verify-role-exports.mjs', 'role export global'],
  ['../audit/static-scan.mjs', 'static invariants'],
]) {
  console.log(`\n▶ Phase 4: ${label}\n`);
  const r = spawnSync('node', [path.join(dir, script)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

process.exit(failed === 0 ? 0 : 1);
