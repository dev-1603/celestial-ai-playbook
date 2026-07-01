#!/usr/bin/env node

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
  getProjectRules,
} from './lib/cursor-export.mjs';
import { collectRoles } from './lib/role-parser.mjs';
import {
  resolveRoleOutputDir,
  roleArtifactFilename,
  adaptRole,
} from './lib/role-adapters.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const HOME = process.env.HOME;

const PATHS = {
  commands: path.join(HOME, '.cursor', 'commands'),
  skills: path.join(HOME, '.cursor', 'skills'),
  globalRules: path.join(HOME, '.cursor', 'celestial-playbook', 'rules'),
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeLegacyMisclassifiedSkills() {
  if (!fs.existsSync(PATHS.skills)) return 0;

  const manifest = loadManifest(REPO_ROOT);
  const validSkills = new Set(
    collectComponents(manifest)
      .filter(({ config }) => config.type === 'skill')
      .map(({ key }) => `celestial-${key.split('/').pop()}`)
  );

  let removed = 0;
  for (const entry of fs.readdirSync(PATHS.skills, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('celestial-')) continue;
    if (validSkills.has(entry.name)) continue;

    fs.rmSync(path.join(PATHS.skills, entry.name), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

function installGlobal(manifest) {
  ensureDir(PATHS.commands);
  ensureDir(PATHS.skills);
  ensureDir(PATHS.globalRules);

  const installed = { rules: [], skills: [], commands: [] };

  for (const { key, config } of collectComponents(manifest, { scope: 'global' })) {
    const content = readComponent(REPO_ROOT, key);

    if (config.type === 'rule') {
      const mdc = buildRuleMdc(key, config, content);
      const out = path.join(PATHS.globalRules, ruleFileName(key));
      fs.writeFileSync(out, mdc);
      installed.rules.push({ key, path: out });
    }

    if (config.type === 'skill') {
      const skillName = `celestial-${key.split('/').pop()}`;
      const skillDir = path.join(PATHS.skills, skillName);
      ensureDir(skillDir);
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        buildSkillMd({ ...config, skillName }, content)
      );
      installed.skills.push({ key, path: skillDir });
    }
  }

  const roles = collectRoles(REPO_ROOT, manifest);
  const commandsDir = resolveRoleOutputDir('cursor', HOME, { global: true });
  ensureDir(commandsDir);
  for (const role of roles) {
    const fileName = roleArtifactFilename('cursor', role);
    const out = path.join(commandsDir, fileName);
    fs.writeFileSync(out, adaptRole('cursor', role));
    installed.commands.push({ key: role.key, command: `/${role.command}`, path: out });
  }

  return installed;
}

function syncProjectRules(manifest, projectDir) {
  const rulesDir = path.join(projectDir, '.cursor', 'rules');
  ensureDir(rulesDir);

  const synced = [];

  for (const { key, config: componentConfig, content } of getProjectRules(
    manifest,
    REPO_ROOT,
    projectDir
  )) {
    const out = path.join(rulesDir, ruleFileName(key));
    fs.writeFileSync(out, buildRuleMdc(key, componentConfig, content));
    synced.push({ key, path: out });
  }

  return synced;
}

function printSummary(installed, removedLegacy) {
  console.log('\n📋 Celestial Playbook → Cursor install complete\n');
  console.log(`  Rules:    ${installed.rules.length} → ${PATHS.globalRules}`);
  console.log(`  Skills:   ${installed.skills.length} → ${PATHS.skills}`);
  console.log(`  Commands: ${installed.commands.length} → ${PATHS.commands}`);
  if (removedLegacy > 0) {
    console.log(`  Cleaned:  ${removedLegacy} misclassified skill(s) removed`);
  }

  console.log('\n── Rules (standards — sync to projects) ──');
  for (const item of installed.rules) {
    console.log(`  ${path.basename(item.path)}`);
  }

  console.log('\n── Skills (on-demand workflows) ──');
  for (const item of installed.skills) {
    console.log(`  ${path.basename(item.path)}`);
  }

  console.log('\n── Commands (type / in chat) ──');
  for (const item of installed.commands) {
    console.log(`  ${item.command}`);
  }

  console.log(`
Next steps:
  1. Run "ai-playbook sync" inside a project to copy rules to .cursor/rules/
  2. Type /celestial-backend (or any command above) to switch persona
  3. Skills auto-load when relevant, or say "use celestial-observability skill"
  4. Import rules globally via Cursor → Customize → Rules → Remote Rule (GitHub)
     pointing at this repo, OR run sync per project
`);
}

function main() {
  const mode = process.argv[2] || 'global';
  const manifest = loadManifest(REPO_ROOT);

  if (mode === 'sync') {
    const synced = syncProjectRules(manifest, process.cwd());
    console.log(`✅ Synced ${synced.length} rules to ${path.join(process.cwd(), '.cursor', 'rules')}`);
    return;
  }

  const removedLegacy = removeLegacyMisclassifiedSkills();
  const installed = installGlobal(manifest);
  printSummary(installed, removedLegacy);
}

main();
