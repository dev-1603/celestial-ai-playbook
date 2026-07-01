#!/usr/bin/env node

/**
 * Global Cursor install — rules, skills, commands to ~/.cursor/ only.
 * No project-directory writes. Use `ai-playbook generate-rules` for project rules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadManifest,
  readComponent,
  buildRuleMdc,
  buildSkillMd,
  ruleFileName,
  collectComponents,
  stripPlaybookMetadata,
} from './lib/cursor-export.mjs';
import { resolveSkill } from './lib/skill-resolver.mjs';
import { getGlobalPaths, cliResult } from './lib/global-paths.mjs';
import { exportRoles } from './export-roles.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeLegacyMisclassifiedSkills(paths, manifest) {
  if (!fs.existsSync(paths.cursor.skills)) return 0;

  const validSkills = new Set(
    collectComponents(manifest)
      .filter(({ config }) => config.type === 'skill')
      .map(({ key }) => `celestial-${key.split('/').pop()}`)
  );

  let removed = 0;
  for (const entry of fs.readdirSync(paths.cursor.skills, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('celestial-')) continue;
    if (validSkills.has(entry.name)) continue;
    fs.rmSync(path.join(paths.cursor.skills, entry.name), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

function installGlobalRulesAndSkills(manifest, paths) {
  ensureDir(paths.cursor.rules);
  ensureDir(paths.cursor.skills);

  const installed = { rules: [], skills: [] };

  for (const { key, config } of collectComponents(manifest, { scope: 'global' })) {
    if (config.type === 'rule') {
      const content = readComponent(REPO_ROOT, key);
      const mdc = buildRuleMdc(key, config, content);
      const out = path.join(paths.cursor.rules, ruleFileName(key));
      fs.writeFileSync(out, mdc);
      installed.rules.push({ key, path: out });
    }

    if (config.type === 'skill') {
      const resolved = resolveSkill(REPO_ROOT, key, { level: 'skill', manifest });
      const skillName = `celestial-${key.split('/').pop()}`;
      const skillDir = path.join(paths.cursor.skills, skillName);
      ensureDir(skillDir);

      const body = resolved.ok ? resolved.skill.body : stripPlaybookMetadata(readComponent(REPO_ROOT, key));
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        buildSkillMd({ ...config, skillName, description: config.description }, body)
      );
      installed.skills.push({ key, path: skillDir });
    }
  }

  return installed;
}

function printSummary(installed, commands, paths, removedLegacy) {
  console.log('\n📋 Celestial Playbook → Global Cursor Install\n');
  console.log(`  Rules:    ${installed.rules.length} → ${paths.cursor.rules}`);
  console.log(`  Skills:   ${installed.skills.length} → ${paths.cursor.skills}`);
  console.log(`  Commands: ${commands} → ${paths.cursor.commands}`);
  if (removedLegacy > 0) {
    console.log(`  Cleaned:  ${removedLegacy} misclassified skill(s) removed`);
  }
  console.log('\nOK: Global install complete. Use `ai-playbook generate-rules` for project-local rules.\n');
}

function main() {
  const mode = process.argv[2] || 'global';

  if (mode === 'sync') {
    console.error('ERROR: `sync` removed. Use `ai-playbook generate-rules <project-path> --selectors ...` instead.');
    process.exit(cliResult(false, 'Project sync disabled — global-only install pipeline'));
  }

  const paths = getGlobalPaths();
  const manifest = loadManifest(REPO_ROOT);

  const removedLegacy = removeLegacyMisclassifiedSkills(paths, manifest);
  const installed = installGlobalRulesAndSkills(manifest, paths);

  const roleResults = exportRoles({ targets: ['cursor'], global: true, repoRoot: REPO_ROOT });
  const commandCount = roleResults[0]?.written.length || 0;

  printSummary(installed, commandCount, paths, removedLegacy);
  process.exit(0);
}

main();
