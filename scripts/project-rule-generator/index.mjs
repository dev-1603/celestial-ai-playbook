#!/usr/bin/env node

/**
 * Project rule generator — orchestrator-workers workflow.
 * Usage: ai-playbook generate-rules <abs-project-path> --selectors /role/x /language/y /base
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { routeSelectors } from './router.mjs';
import { runWorkers } from './worker.mjs';
import { appendWorkerNotes } from './notes.mjs';
import { synthesizeRules } from './synthesize.mjs';
import { cliResult } from '../lib/global-paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const opts = { projectDir: null, selectors: [] };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--selectors') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        opts.selectors.push(argv[++i]);
      }
    } else if (!opts.projectDir && !argv[i].startsWith('--')) {
      opts.projectDir = path.resolve(argv[i]);
    }
  }

  return opts;
}

export function generateRules(opts) {
  const projectDir = path.resolve(opts.projectDir);
  const selectors = opts.selectors || [];

  const routed = routeSelectors(selectors, REPO_ROOT);
  if (!routed.ok) {
    return { ok: false, stage: 'router', errors: routed.errors };
  }

  const workerResults = runWorkers(routed.modules, REPO_ROOT);
  const notesPath = appendWorkerNotes(projectDir, workerResults);

  const synthesized = synthesizeRules(projectDir, workerResults, { selectors });
  if (!synthesized.ok) {
    return { ok: false, stage: 'synthesize', errors: synthesized.errors, notesPath };
  }

  return {
    ok: true,
    projectDir,
    selectors,
    modules: routed.modules.map(m => m.componentKey),
    notesPath,
    outPath: synthesized.outPath,
    charCount: synthesized.charCount,
    workerResults,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.projectDir) {
    process.exit(cliResult(false, 'Usage: generate-rules <abs-project-path> --selectors /role/x /language/y /base'));
  }

  if (!opts.selectors.length) {
    process.exit(cliResult(false, 'At least one --selectors argument required'));
  }

  const result = generateRules(opts);

  if (!result.ok) {
    console.error(`ERROR: ${result.stage} failed`);
    for (const e of result.errors || []) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('OK: Project rules generated');
  console.log(JSON.stringify({
    projectDir: result.projectDir,
    selectors: result.selectors,
    modules: result.modules,
    notesPath: result.notesPath,
    outPath: result.outPath,
    charCount: result.charCount,
  }, null, 2));
  process.exit(0);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main();

export { generateRules as default };
