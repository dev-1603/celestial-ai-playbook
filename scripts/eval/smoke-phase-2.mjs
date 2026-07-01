#!/usr/bin/env node
/** Phase 2 smoke — frontmatter on roles/skills. Runnable independently. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'verify-frontmatter.mjs');
const r = spawnSync('node', [script], { stdio: 'inherit' });
process.exit(r.status ?? 1);
