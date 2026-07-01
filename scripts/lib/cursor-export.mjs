import fs from 'fs';
import path from 'path';

export function loadManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, 'playbook.manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

export function stripPlaybookMetadata(content) {
  return content
    .replace(/^@trigger\s+.+$/m, '')
    .replace(/^@priority\s+\d+$/m, '')
    .replace(/^@files\s+.+$/m, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function readComponent(repoRoot, componentKey) {
  const flatPath = path.join(repoRoot, 'src', `${componentKey}.md`);
  const skillMdPath = path.join(repoRoot, 'src', componentKey, 'SKILL.md');

  if (fs.existsSync(skillMdPath)) {
    return fs.readFileSync(skillMdPath, 'utf-8');
  }
  if (fs.existsSync(flatPath)) {
    return fs.readFileSync(flatPath, 'utf-8');
  }
  throw new Error(`Component not found: src/${componentKey}.md or src/${componentKey}/SKILL.md`);
}

export function buildRuleMdc(componentKey, config, content) {
  const body = stripPlaybookMetadata(content);
  const lines = ['---'];

  if (config.alwaysApply) {
    lines.push('alwaysApply: true');
  } else {
    lines.push('alwaysApply: false');
    if (config.description) {
      lines.push(`description: ${JSON.stringify(config.description)}`);
    }
    if (config.globs) {
      lines.push(`globs: ${config.globs}`);
    }
  }

  lines.push('---', '', body);
  return lines.join('\n');
}

export function buildCommandMd(config, content) {
  const body = stripPlaybookMetadata(content);
  const title = config.title || config.command;

  return `# ${title}

Adopt the persona and constraints below for the **current task**. Follow every dry-run protocol, mandatory checklist, and forbidden/required rule before writing or changing code.

---

${body}
`;
}

export function buildSkillMd(config, content) {
  const body = stripPlaybookMetadata(content);
  const name = config.skillName || `celestial-${path.basename(config.command || '', '.md')}`;

  return `---
name: ${name}
description: ${JSON.stringify(config.description).slice(1, -1)}
---

${body}
`;
}

export function ruleFileName(componentKey) {
  return `celestial-${componentKey.replace(/\//g, '-')}.mdc`;
}

export function collectComponents(manifest, { scope } = {}) {
  return Object.entries(manifest.components)
    .filter(([, config]) => {
      if (scope === 'global') return config.scope !== 'project';
      if (scope === 'project') return config.scope === 'project';
      return true;
    })
    .map(([key, config]) => ({ key, config }));
}

export function loadProjectConfig(projectDir) {
  const configPath = path.join(projectDir, '.ai-playbook.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export function getEnabledArchitecture(projectDir) {
  const config = loadProjectConfig(projectDir);
  return new Set(config?.architecture || []);
}

export function shouldIncludeRule(key, config, enabledArchitecture) {
  if (config.type !== 'rule') return false;
  if (config.scope === 'project') {
    const archName = key.replace('architecture/', '');
    return enabledArchitecture.has(archName);
  }
  return true;
}

/** Rules to export for a project, respecting .ai-playbook.json architecture overlays. */
export function getProjectRules(manifest, repoRoot, projectDir) {
  const enabledArchitecture = getEnabledArchitecture(projectDir);
  const rules = [];

  for (const { key, config } of collectComponents(manifest)) {
    if (!shouldIncludeRule(key, config, enabledArchitecture)) continue;
    const content = readComponent(repoRoot, key);
    rules.push({
      key,
      config,
      content,
      body: stripPlaybookMetadata(content),
    });
  }

  return rules;
}
