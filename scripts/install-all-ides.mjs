#!/usr/bin/env node

/**
 * Global multi-IDE installer — all targets write to user home only.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGlobalPaths } from './lib/global-paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ['all'];

const scripts = {
  cursorGlobal: path.join(REPO_ROOT, 'scripts', 'install-cursor.mjs'),
  multiIde: path.join(REPO_ROOT, 'scripts', 'install-multi-ide.mjs'),
  exportRoles: path.join(REPO_ROOT, 'scripts', 'export-roles.mjs'),
};

function runNode(scriptPath, scriptArgs = []) {
  const result = spawnSync('node', [scriptPath, ...scriptArgs], { stdio: 'inherit' });
  return result.status === 0;
}

function shouldRunTarget(tool) {
  if (targets.includes('all')) return true;
  return targets.includes(tool);
}

const paths = getGlobalPaths();

console.log(`
🚀 Global Multi-IDE Installer

Targets: ${targets.join(', ')}
Home:    ${paths.home}
`);

let allSuccess = true;

if (shouldRunTarget('cursor')) {
  console.log('\n🔄 Cursor — global install...');
  if (!runNode(scripts.cursorGlobal, ['global'])) allSuccess = false;
}

for (const tool of ['claude', 'copilot', 'antigravity']) {
  if (!shouldRunTarget(tool)) continue;
  console.log(`\n🔄 ${tool} — global rules export...`);
  if (!runNode(scripts.multiIde, [tool])) allSuccess = false;
}

if (shouldRunTarget('roles') || targets.includes('all')) {
  console.log('\n🔄 Roles — global command export (all IDEs)...');
  if (!runNode(scripts.exportRoles, ['--global', '--target', 'claude,copilot,antigravity'])) {
    allSuccess = false;
  }
}

console.log(allSuccess ? '\nOK: All global installs complete.\n' : '\nERROR: Some installs failed.\n');
process.exit(allSuccess ? 0 : 1);
