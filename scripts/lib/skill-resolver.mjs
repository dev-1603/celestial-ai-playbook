/**
 * Skill resolver — loads metadata → SKILL.md → references on demand.
 * Never loads all layers at once unless explicitly requested.
 */
import fs from 'fs';
import path from 'path';
import { parseMarkdownFile } from './frontmatter.mjs';
import { loadManifest } from './cursor-export.mjs';

const LOAD_LEVELS = ['metadata', 'skill', 'reference'];

/**
 * Resolve component path — supports flat .md or directory/SKILL.md layout.
 * @param {string} repoRoot
 * @param {string} componentKey e.g. "skills/performance-tuning"
 * @returns {{ kind: 'file'|'dir', path: string, skillDir: string }}
 */
export function resolveComponentPath(repoRoot, componentKey) {
  const flatPath = path.join(repoRoot, 'src', `${componentKey}.md`);
  const dirPath = path.join(repoRoot, 'src', componentKey);
  const skillMdPath = path.join(dirPath, 'SKILL.md');

  if (fs.existsSync(skillMdPath)) {
    return { kind: 'dir', path: skillMdPath, skillDir: dirPath };
  }
  if (fs.existsSync(flatPath)) {
    return { kind: 'file', path: flatPath, skillDir: path.dirname(flatPath) };
  }
  return null;
}

/**
 * @param {string} repoRoot
 * @param {string} componentKey
 * @param {{ level?: 'metadata'|'skill'|'reference', reference?: string, manifest?: object }} [options]
 */
export function resolveSkill(repoRoot, componentKey, options = {}) {
  const { level = 'metadata', reference = null } = options;
  if (!LOAD_LEVELS.includes(level)) {
    throw new Error(`Invalid load level "${level}". Use: ${LOAD_LEVELS.join(', ')}`);
  }

  const manifest = options.manifest || loadManifest(repoRoot);
  const manifestEntry = manifest.components?.[componentKey] || null;

  const resolved = resolveComponentPath(repoRoot, componentKey);
  if (!resolved) {
    return {
      ok: false,
      level,
      componentKey,
      error: 'MISSING_REFERENCE',
      metadata: manifestEntry ? { description: manifestEntry.description, type: manifestEntry.type } : null,
    };
  }

  const result = {
    ok: true,
    level,
    componentKey,
    sourcePath: resolved.path,
    metadata: {},
    skill: null,
    reference: null,
    referencesLoaded: [],
  };

  // Layer 1: manifest metadata only
  if (manifestEntry) {
    result.metadata = {
      key: componentKey,
      type: manifestEntry.type,
      description: manifestEntry.description,
      scope: manifestEntry.scope || 'global',
    };
  }

  if (level === 'metadata') {
    return result;
  }

  // Layer 2: SKILL.md body (lean)
  const parsed = parseMarkdownFile(resolved.path);
  result.metadata = { ...result.metadata, ...parsed.meta };
  result.skill = {
    body: parsed.body,
    tokenEstimate: parsed.body.split(/\s+/).length,
  };

  if (level === 'skill') {
    return result;
  }

  // Layer 3: specific reference file
  if (!reference) {
    throw new Error('reference filename required when level is "reference"');
  }

  const refPath = path.join(resolved.skillDir, 'references', reference);
  if (!fs.existsSync(refPath)) {
    return {
      ok: false,
      level: 'reference',
      componentKey,
      error: 'MISSING_REFERENCE',
      reference,
      expectedPath: refPath,
    };
  }

  result.reference = {
    name: reference,
    content: fs.readFileSync(refPath, 'utf-8'),
    path: refPath,
  };
  result.referencesLoaded = [reference];

  return result;
}

/**
 * List available reference files for a skill without loading content.
 */
export function listSkillReferences(repoRoot, componentKey) {
  const resolved = resolveComponentPath(repoRoot, componentKey);
  if (!resolved) return [];

  const refsDir = path.join(resolved.skillDir, 'references');
  if (!fs.existsSync(refsDir)) return [];

  return fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
}

/**
 * Estimate token count for a resolution result.
 */
export function estimateTokens(result) {
  let tokens = 0;
  if (result.metadata) tokens += JSON.stringify(result.metadata).length / 4;
  if (result.skill?.body) tokens += result.skill.body.length / 4;
  if (result.reference?.content) tokens += result.reference.content.length / 4;
  return Math.round(tokens);
}
