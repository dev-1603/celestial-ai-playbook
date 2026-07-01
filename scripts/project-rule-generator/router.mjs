/**
 * Router — parse and validate selectors against playbook.manifest.json taxonomy.
 */
import path from 'path';
import { loadManifest } from '../lib/cursor-export.mjs';

export const MAX_SELECTORS = 8;

const PREFIX_MAP = {
  role: 'roles',
  roles: 'roles',
  language: 'languages',
  languages: 'languages',
  framework: 'frameworks',
  frameworks: 'frameworks',
  pattern: 'design-patterns',
  'design-pattern': 'design-patterns',
  'design-patterns': 'design-patterns',
  protocol: 'design-patterns',
  rest: 'design-patterns/api-design',
  data: 'data-layers',
  'data-layer': 'data-layers',
  'data-layers': 'data-layers',
  cloud: 'cloud-ai',
  'cloud-ai': 'cloud-ai',
  architecture: 'architecture',
  arch: 'architecture',
  skill: 'skills',
  skills: 'skills',
  base: 'base',
};

/**
 * @param {string} raw e.g. "/role/backend", "/typescript", "/base"
 */
export function parseSelector(raw) {
  const trimmed = raw.trim().replace(/^\//, '');
  if (!trimmed) {
    return { ok: false, error: 'EMPTY_SELECTOR', raw };
  }

  const parts = trimmed.split('/').filter(Boolean);

  if (parts.length === 1) {
    const name = parts[0];
    // Try direct manifest key match across categories
    return { ok: true, raw, componentKey: null, name, prefix: null };
  }

  const [prefix, ...rest] = parts;
  const mappedPrefix = PREFIX_MAP[prefix.toLowerCase()];
  if (!mappedPrefix) {
    return { ok: false, error: 'UNKNOWN_PREFIX', raw, prefix };
  }

  const name = rest.join('/');
  if (mappedPrefix.includes('/')) {
    return { ok: true, raw, componentKey: mappedPrefix, name, prefix };
  }

  return { ok: true, raw, componentKey: `${mappedPrefix}/${name}`, name, prefix };
}

const ALIASES = {
  rest: 'design-patterns/api-design',
  'api-design': 'design-patterns/api-design',
  typescript: 'languages/typescript',
  javascript: 'languages/javascript',
  python: 'languages/python-core',
  go: 'languages/go-core',
  nestjs: 'frameworks/nestjs',
  'vue-nuxt': 'frameworks/vue-nuxt',
  'react-next': 'frameworks/react-next',
  'system-architect': 'roles/system-architect',
  architect: 'roles/system-architect',
  backend: 'roles/backend',
  frontend: 'roles/frontend',
  base: 'base/global-rules',
  'global-rules': 'base/global-rules',
};

/**
 * Resolve a parsed selector to a manifest component key.
 */
export function resolveComponentKey(parsed, manifest) {
  if (parsed.componentKey && manifest.components[parsed.componentKey]) {
    return parsed.componentKey;
  }

  const name = parsed.name;

  if (ALIASES[name] && manifest.components[ALIASES[name]]) {
    return ALIASES[name];
  }
  const candidates = [
    `roles/${name}`,
    `languages/${name}`,
    `frameworks/${name}`,
    `design-patterns/${name}`,
    `data-layers/${name}`,
    `cloud-ai/${name}`,
    `architecture/${name}`,
    `skills/${name}`,
    `base/${name}`,
  ];

  if (name === 'base' || name === 'global-rules') return 'base/global-rules';

  for (const key of candidates) {
    if (manifest.components[key]) return key;
  }

  return null;
}

/**
 * @param {string[]} selectorArgs
 * @param {string} repoRoot
 */
export function routeSelectors(selectorArgs, repoRoot) {
  const manifest = loadManifest(repoRoot);
  const errors = [];
  const modules = [];

  if (!selectorArgs.length) {
    return { ok: false, errors: ['NO_SELECTORS'], modules: [] };
  }

  if (selectorArgs.length > MAX_SELECTORS) {
    return {
      ok: false,
      errors: [`MAX_SELECTORS_EXCEEDED: ${selectorArgs.length} > ${MAX_SELECTORS}`],
      modules: [],
    };
  }

  const seen = new Set();

  for (const raw of selectorArgs) {
    const parsed = parseSelector(raw);
    if (!parsed.ok) {
      errors.push(`${parsed.error}: ${raw}`);
      continue;
    }

    const componentKey = resolveComponentKey(parsed, manifest);
    if (!componentKey) {
      errors.push(`UNKNOWN_SELECTOR: ${raw}`);
      continue;
    }

    if (seen.has(componentKey)) continue;
    seen.add(componentKey);

    const config = manifest.components[componentKey];
    modules.push({
      selector: raw,
      componentKey,
      type: config.type,
      scope: config.scope || 'global',
      description: config.description || '',
    });
  }

  if (errors.length) {
    return { ok: false, errors, modules };
  }

  return { ok: true, errors: [], modules, manifest };
}
