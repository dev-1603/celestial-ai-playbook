import path from 'path';
import { generatedBanner, roleInstructionIntro } from './role-parser.mjs';

/**
 * IDE adapters transform one normalized role into target-specific artifacts.
 * Adapters adapt format, not meaning.
 */

function withBanner(role, content) {
  return `${generatedBanner(role)}\n\n${content}`;
}

export const ROLE_TARGETS = {
  cursor: {
    id: 'cursor',
    label: 'Cursor',
    scope: 'global-or-project',
    description: 'Cursor slash commands',
  },
  claude: {
    id: 'claude',
    label: 'Claude Code',
    scope: 'project',
    description: 'Claude Code slash commands',
  },
  copilot: {
    id: 'copilot',
    label: 'GitHub Copilot / VS Code',
    scope: 'project',
    description: 'Workspace prompt files',
  },
  antigravity: {
    id: 'antigravity',
    label: 'Antigravity (experimental)',
    scope: 'project',
    description: 'Agent presets',
    experimental: true,
  },
};

export function resolveRoleOutputDir(target, baseDir, { global = false } = {}) {
  switch (target) {
    case 'cursor':
      return global
        ? path.join(baseDir, '.cursor', 'commands')
        : path.join(baseDir, '.cursor', 'commands');
    case 'claude':
      return path.join(baseDir, '.claude', 'commands');
    case 'copilot':
      return path.join(baseDir, '.github', 'prompts');
    case 'antigravity':
      return path.join(baseDir, '.agent', 'presets');
    default:
      throw new Error(`Unsupported role export target: ${target}`);
  }
}

export function roleArtifactFilename(target, role) {
  switch (target) {
    case 'cursor':
    case 'claude':
      return `${role.command}.md`;
    case 'copilot':
      return `${role.command}.prompt.md`;
    case 'antigravity':
      return `${role.command}.md`;
    default:
      throw new Error(`Unsupported role export target: ${target}`);
  }
}

/** Cursor command — plain markdown prompt body. */
export function adaptCursor(role) {
  return withBanner(
    role,
    `# ${role.title}

${roleInstructionIntro(role)}

---

${role.body}
`
  );
}

/** Claude Code command — YAML frontmatter + prompt body. */
export function adaptClaude(role) {
  const lines = [
    '---',
    `description: ${JSON.stringify(role.description)}`,
    'disable-model-invocation: true',
    '---',
    '',
    generatedBanner(role),
    '',
    `# ${role.title}`,
    '',
    roleInstructionIntro(role),
    '',
    '---',
    '',
    role.body,
  ];
  return lines.join('\n');
}

/** Copilot / VS Code prompt file. */
export function adaptCopilot(role) {
  const lines = [
    '---',
    `description: ${JSON.stringify(role.description)}`,
    `name: ${role.command}`,
    'agent: agent',
    '---',
    '',
    generatedBanner(role),
    '',
    `# ${role.title}`,
    '',
    roleInstructionIntro(role),
    '',
    '---',
    '',
    role.body,
  ];
  return lines.join('\n');
}

/** Antigravity preset — experimental markdown preset. */
export function adaptAntigravity(role) {
  const lines = [
    '---',
    `name: ${role.command}`,
    `title: ${JSON.stringify(role.title)}`,
    `description: ${JSON.stringify(role.description)}`,
    'type: preset',
    'experimental: true',
    '---',
    '',
    generatedBanner(role),
    '',
    `# ${role.title}`,
    '',
    roleInstructionIntro(role),
    '',
    '---',
    '',
    role.body,
  ];
  return lines.join('\n');
}

export function adaptRole(target, role) {
  switch (target) {
    case 'cursor':
      return adaptCursor(role);
    case 'claude':
      return adaptClaude(role);
    case 'copilot':
      return adaptCopilot(role);
    case 'antigravity':
      return adaptAntigravity(role);
    default:
      throw new Error(`Unsupported role export target: ${target}`);
  }
}
