#!/usr/bin/env node
/** Phase 6 smoke — CLI ACI contracts. Runnable independently. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'smoke-per-command.mjs');
const r = spawnSync('node', [script], { stdio: 'inherit' });
process.exit(r.status ?? 1);
