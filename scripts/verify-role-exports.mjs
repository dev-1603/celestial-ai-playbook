#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadRoles } from './lib/load-roles.mjs';
import { exportRoles, render } from './export-roles.mjs';
import { getGlobalPaths } from './lib/global-paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;

function fail(message) {
  console.error(`❌ ${message}`);
  failures++;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
  else pass(message);
}

function testLoadRoles() {
  const roles = loadRoles(path.join(REPO_ROOT, 'src', 'roles'));
  assert(roles.length === 13, `loaded ${roles.length} roles`);
  const pr = roles.find(r => r.name === 'pr-reviewer');
  assert(pr?.command === 'celestial-review-pr', 'pr-reviewer command aligned with manifest');
  assert(pr?.targets.cursor.type === 'command', 'pr-reviewer cursor target type');
}

function testRenderers() {
  const roles = loadRoles(path.join(REPO_ROOT, 'src', 'roles'));
  const be = roles.find(r => r.name === 'backend');
  const cursor = render('cursor', be);
  assert(cursor.includes('AUTO-GENERATED'), 'cursor render has banner');
  assert(cursor.includes('Backend Developer'), 'cursor render has title');

  const claude = render('claude', be);
  assert(claude.includes('disable-model-invocation: true'), 'claude render has frontmatter');

  const copilot = render('copilot', be);
  assert(copilot.includes('.prompt.md') === false, 'copilot render is content not filename');
  assert(copilot.includes('agent: agent'), 'copilot render has agent field');
}

function testExportGlobalTemp() {
  const tmpHome = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-global-export-'));
  const paths = getGlobalPaths(tmpHome);

  try {
    exportRoles({
      targets: ['cursor', 'claude'],
      global: true,
      homeDir: tmpHome,
      repoRoot: REPO_ROOT,
    });

    assert(fs.existsSync(paths.cursor.commands), 'cursor commands dir created');
    const files = fs.readdirSync(paths.cursor.commands).filter(f => f.endsWith('.md'));
    assert(files.length >= 13, `cursor commands exported (${files.length})`);

    const sample = fs.readFileSync(path.join(paths.cursor.commands, 'celestial-backend.md'), 'utf-8');
    assert(sample.includes('AUTO-GENERATED'), 'exported file has banner');
  } catch (err) {
    fail(`exportRoles global failed: ${err.message}`);
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
}

function main() {
  console.log('\n🧪 Verifying role export pipeline\n');
  testLoadRoles();
  testRenderers();
  testExportGlobalTemp();
  console.log(`\n${failures === 0 ? '✅ All role export checks passed' : `❌ ${failures} check(s) failed`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
