/**
 * Absolute global install paths for all supported IDEs.
 * Single source of truth — no relative paths.
 */
import os from 'os';
import path from 'path';

/**
 * @param {string} [homeDir]
 */
export function getGlobalPaths(homeDir = os.homedir()) {
  const celestialRoot = path.join(homeDir, '.cursor', 'celestial-playbook');
  return {
    home: homeDir,
    celestialRoot,
    cursor: {
      commands: path.join(homeDir, '.cursor', 'commands'),
      skills: path.join(homeDir, '.cursor', 'skills'),
      rules: path.join(celestialRoot, 'rules'),
    },
    claude: {
      commands: path.join(homeDir, '.claude', 'commands'),
      context: path.join(celestialRoot, 'claude', 'CLAUDE.md'),
    },
    copilot: {
      prompts: path.join(homeDir, '.github', 'prompts'),
      instructions: path.join(celestialRoot, 'copilot', 'copilot-instructions.md'),
    },
    antigravity: {
      presets: path.join(homeDir, '.agent', 'presets'),
      rules: path.join(celestialRoot, 'antigravity', 'rules'),
    },
  };
}

/**
 * Resolve output directory for role exports.
 * @param {'cursor'|'claude'|'copilot'|'antigravity'} target
 * @param {{ global?: boolean, projectDir?: string, homeDir?: string }} opts
 */
export function resolveRoleOutputDir(target, opts = {}) {
  const { global = true, projectDir = process.cwd(), homeDir = os.homedir() } = opts;
  const paths = getGlobalPaths(homeDir);

  if (global) {
    switch (target) {
      case 'cursor': return paths.cursor.commands;
      case 'claude': return paths.claude.commands;
      case 'copilot': return paths.copilot.prompts;
      case 'antigravity': return paths.antigravity.presets;
      default: throw new Error(`Unknown target: ${target}`);
    }
  }

  switch (target) {
    case 'cursor': return path.join(projectDir, '.cursor', 'commands');
    case 'claude': return path.join(projectDir, '.claude', 'commands');
    case 'copilot': return path.join(projectDir, '.github', 'prompts');
    case 'antigravity': return path.join(projectDir, '.agent', 'presets');
    default: throw new Error(`Unknown target: ${target}`);
  }
}

/**
 * Print OK/ERROR result for CLI consumers.
 */
export function cliResult(ok, message, data = {}) {
  const prefix = ok ? 'OK:' : 'ERROR:';
  console.log(`${prefix} ${message}`);
  if (Object.keys(data).length) {
    console.log(JSON.stringify(data, null, 2));
  }
  return ok ? 0 : 1;
}
