#!/usr/bin/env node
/** Run all per-phase smokes (2–6) sequentially. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;

for (const phase of [2, 3, 4, 5, 6]) {
  console.log(`\n▶ Phase ${phase} smoke\n`);
  const r = spawnSync('node', [path.join(dir, `smoke-phase-${phase}.mjs`)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

process.exit(failed === 0 ? 0 : 1);
