#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadManifest,
  getProjectRules,
} from './lib/cursor-export.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sectionTitle(key) {
  return key.replace(/\//g, ' > ').toUpperCase();
}

function exportClaude(manifest, projectDir) {
  const rules = getProjectRules(manifest, REPO_ROOT, projectDir);
  const sections = rules.map(
    ({ key, body }) => `## ${sectionTitle(key)}\n\n${body}`
  );

  const configNote = loadConfigNote(projectDir);
  const claudeMd = `# Celestial Playbook — Claude Code Context

This file provides Claude with org-wide engineering standards, design patterns, and conventions.
${configNote}

${sections.join('\n\n---\n\n')}
`;

  const out = path.join(projectDir, 'CLAUDE.md');
  fs.writeFileSync(out, claudeMd);
  return { file: out, size: claudeMd.length, count: rules.length };
}

function exportCopilot(manifest, projectDir) {
  const rules = getProjectRules(manifest, REPO_ROOT, projectDir);
  const sections = rules.map(
    ({ key, body }) => `### ${sectionTitle(key)}\n\n${body}`
  );

  const configNote = loadConfigNote(projectDir);
  const copilotInstructions = `# Copilot Instructions — Celestial Playbook

GitHub Copilot follows these org-wide standards.
${configNote}

${sections.join('\n\n---\n\n')}
`;

  ensureDir(path.join(projectDir, '.github'));
  const out = path.join(projectDir, '.github', 'copilot-instructions.md');
  fs.writeFileSync(out, copilotInstructions);
  return { file: out, size: copilotInstructions.length, count: rules.length };
}

function exportAntigravity(manifest, projectDir) {
  const rulesDir = path.join(projectDir, '.rules');
  ensureDir(rulesDir);

  // Remove stale playbook exports (all manifest rule filenames)
  for (const [key, config] of Object.entries(manifest.components)) {
    if (config.type !== 'rule') continue;
    const stale = path.join(rulesDir, `${key.replace(/\//g, '-')}.md`);
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
  }

  const rules = getProjectRules(manifest, REPO_ROOT, projectDir);

  for (const { key, body } of rules) {
    const out = path.join(rulesDir, `${key.replace(/\//g, '-')}.md`);
    fs.writeFileSync(out, body);
  }

  return { directory: rulesDir, count: rules.length };
}

function loadConfigNote(projectDir) {
  const configPath = path.join(projectDir, '.ai-playbook.json');
  if (!fs.existsSync(configPath)) return '';

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.architecture?.length) return '';

  return `\nArchitecture overlays enabled: ${config.architecture.join(', ')}.`;
}

function printSummary(target, result) {
  console.log(`\n✅ Exported to ${target}\n`);

  if (result.file) {
    console.log(`  📄 ${path.basename(result.file)}`);
    console.log(`     Rules: ${result.count}`);
    console.log(`     Size: ${(result.size / 1024).toFixed(1)} KB`);
  } else if (result.directory) {
    console.log(`  📁 ${path.basename(result.directory)}/`);
    console.log(`     Files: ${result.count}`);
  }
}

function main() {
  const projectDir = process.cwd();
  const manifest = loadManifest(REPO_ROOT);
  const target = process.argv[2] || 'claude';
  const validTargets = new Set(['claude', 'copilot', 'antigravity', 'all']);

  if (!validTargets.has(target)) {
    console.error(`Error: Unknown target '${target}'. Use: claude, copilot, antigravity, all`);
    process.exit(1);
  }

  if (target === 'claude' || target === 'all') {
    printSummary('Claude Code', exportClaude(manifest, projectDir));
  }

  if (target === 'copilot' || target === 'all') {
    printSummary('GitHub Copilot', exportCopilot(manifest, projectDir));
  }

  if (target === 'antigravity' || target === 'all') {
    printSummary('Antigravity', exportAntigravity(manifest, projectDir));
  }
}

main();
