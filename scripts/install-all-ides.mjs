#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ['all'];

const scripts = {
  cursorGlobal: path.join(REPO_ROOT, 'scripts', 'install-cursor.mjs'),
  cursorSync: path.join(REPO_ROOT, 'scripts', 'install-cursor.mjs'),
  multiIde: path.join(REPO_ROOT, 'scripts', 'install-multi-ide.mjs'),
  exportRoles: path.join(REPO_ROOT, 'scripts', 'export-roles.mjs'),
};

function runNode(scriptPath, mode) {
  const result = spawnSync('node', [scriptPath, mode], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  return result.status === 0;
}

function isProjectContext() {
  const cwd = process.cwd();
  if (path.resolve(cwd) === path.resolve(REPO_ROOT)) return false;
  if (fs.existsSync(path.join(cwd, '.ai-playbook.json'))) return true;
  if (fs.existsSync(path.join(cwd, '.git'))) return true;
  return false;
}

function shouldRunTarget(tool) {
  if (targets.includes('all')) return true;
  return targets.includes(tool);
}

console.log(`
🚀 Multi-IDE Installer for Celestial Playbook

Targets: ${targets.join(', ')}
Project: ${process.cwd()}
`);

let allSuccess = true;

if (shouldRunTarget('cursor')) {
  console.log('\n🔄 Cursor — global install (~/.cursor/)...');
  if (!runNode(scripts.cursorGlobal, 'global')) allSuccess = false;

  if (isProjectContext()) {
    console.log('\n🔄 Cursor — project sync (.cursor/rules/)...');
    if (!runNode(scripts.cursorSync, 'sync')) allSuccess = false;
  } else {
    console.log('\nℹ️  Skipping Cursor sync (not in a project repo). Run from a project or use: ai-playbook sync');
  }
}

for (const tool of ['claude', 'copilot', 'antigravity']) {
  if (!shouldRunTarget(tool)) continue;

  console.log(`\n🔄 ${tool} — project export...`);
  if (!runNode(scripts.multiIde, tool)) allSuccess = false;
}

if (shouldRunTarget('roles') || targets.includes('all')) {
  console.log('\n🔄 Roles — cross-IDE project export...');
  if (!runNode(scripts.exportRoles, 'claude,copilot,antigravity')) allSuccess = false;

  if (isProjectContext()) {
    console.log('\n🔄 Roles — Cursor project commands (.cursor/commands/)...');
    if (!runNode(scripts.exportRoles, 'cursor')) allSuccess = false;
  }
}

console.log(`
${allSuccess ? '✅ All exports complete!' : '❌ Some exports failed'}
`);

process.exit(allSuccess ? 0 : 1);
