/**
 * Loads and normalizes roles from the src/roles/ directory.
 */
import fs from 'fs';
import path from 'path';
import { parseMarkdownFile } from './frontmatter.mjs';

/**
 * Canonical metadata schema for role files.
 * Used as documentation, fallback source, and for future validation.
 *
 * Frontmatter fields accepted:
 *   id          – Unique string id, e.g. "roles/backend". Auto-derived if absent.
 *   kind        – Must be "role". Defaulted if absent.
 *   name        – Machine-friendly slug, e.g. "backend". Derived from filename.
 *   title       – Human-readable title. Derived from heading or filename.
 *   description – One-line summary. Derived from first heading/paragraph.
 *   command     – Kebab-case CLI command, e.g. "celestial-backend".
 *   scope       – "global" | "project". Defaults to "global".
 *   targets     – Per-IDE config object (see shape below).
 *
 * targets shape:
 *   cursor:      { enabled: boolean, type: "command" | "skill" }
 *   claude:      { enabled: boolean, type: "command" }
 *   copilot:     { enabled: boolean, type: "prompt" }
 *   antigravity: { enabled: boolean, type: "preset" }
 */
export const ROLE_SCHEMA = {
  fields: ['id', 'kind', 'name', 'title', 'description', 'command', 'scope', 'targets'],
  defaults: {
    kind: 'role',
    scope: 'global',
    targets: {
      cursor:      { enabled: true, type: 'command' },
      claude:      { enabled: true, type: 'command' },
      copilot:     { enabled: true, type: 'prompt'  },
      antigravity: { enabled: true, type: 'preset'  },
    },
  },
  targetTypes: {
    cursor:      ['command', 'skill'],
    claude:      ['command'],
    copilot:     ['prompt'],
    antigravity: ['preset'],
  },
};

function toTitleCase(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Extracts a fallback description from the markdown body.
 * Strips the "ROLE: " prefix that legacy files use in their first heading.
 */
function extractFallbackDescription(body) {
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('@') || t.startsWith('---')) continue;
    if (t.startsWith('>') || t.startsWith('- ') || t.startsWith('* ')) continue;
    if (t.startsWith('#')) {
      return t.replace(/^#+\s*(?:ROLE:\s*)?/, '');
    }
    return t;
  }
  return '';
}

/**
 * Normalizes a raw targets object parsed from frontmatter against schema defaults.
 */
function normalizeTargets(raw) {
  const defaults = ROLE_SCHEMA.defaults.targets;
  return Object.fromEntries(
    Object.entries(defaults).map(([ide, fallback]) => {
      const src = raw?.[ide] ?? {};
      return [ide, {
        enabled: src.enabled ?? fallback.enabled,
        type:    src.type    ?? fallback.type,
      }];
    })
  );
}

/**
 * Reads all role markdown files and returns a list of normalized role objects.
 *
 * @param {string} rolesDir
 * @returns {Array<{id,kind,name,title,description,command,scope,targets,body,sourcePath}>}
 */
export function loadRoles(rolesDir = 'src/roles') {
  if (!fs.existsSync(rolesDir)) return [];

  const files = fs.readdirSync(rolesDir).filter(f => f.endsWith('.md'));
  const roles = [];

  for (const file of files) {
    const filePath = path.join(rolesDir, file);
    const parsed = parseMarkdownFile(filePath);
    const slug = path.basename(file, '.md');
    const m = parsed.meta;

    const id          = m.id          || `roles/${slug}`;
    const kind        = m.kind        || ROLE_SCHEMA.defaults.kind;
    const name        = m.name        || slug;
    const title       = m.title       || toTitleCase(slug);
    const description = m.description || extractFallbackDescription(parsed.body);
    const command     = m.command     || `celestial-${slug}`;
    const scope       = m.scope       || ROLE_SCHEMA.defaults.scope;
    const targets     = normalizeTargets(m.targets);

    const role = { id, kind, name, title, description, command, scope, targets, body: parsed.body, sourcePath: filePath };

    // Validation
    if (role.kind !== 'role') {
      throw new Error(`[${filePath}] kind must be "role", got "${role.kind}"`);
    }
    if (!/^[a-z0-9-]+$/.test(role.command)) {
      throw new Error(`[${filePath}] command must be kebab-case, got "${role.command}"`);
    }

    roles.push(role);
  }

  // Uniqueness check
  const seen = new Set();
  for (const r of roles) {
    if (seen.has(r.id)) throw new Error(`Duplicate role id: ${r.id}`);
    seen.add(r.id);
  }

  return roles;
}
