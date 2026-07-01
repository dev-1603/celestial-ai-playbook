#!/usr/bin/env node
/** Phase 3 smoke — JIT skill resolver. Runnable independently. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'verify-skill-resolver.mjs');
const r = spawnSync('node', [script], { stdio: 'inherit' });
process.exit(r.status ?? 1);
