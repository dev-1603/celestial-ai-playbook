/**
 * Worker — isolated module reader returning condensed summaries only.
 * Reads ONLY the assigned module's source file(s).
 */
import fs from 'fs';
import path from 'path';
import { stripPlaybookMetadata } from '../lib/cursor-export.mjs';
import { resolveComponentPath } from '../lib/skill-resolver.mjs';

export const SUMMARY_CHAR_BUDGET = 6000; // ~1500 tokens

/**
 * Deterministic condensation — headings + bullets, no narrative padding.
 */
export function condenseContent(content, budget = SUMMARY_CHAR_BUDGET) {
  const lines = stripPlaybookMetadata(content).split(/\r?\n/);
  const kept = [];
  let size = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const isHighSignal = t.startsWith('#') || t.startsWith('-') || t.startsWith('*') ||
      t.startsWith('>') || t.startsWith('□') || /^(Forbidden|Required|Priorities|Heuristics)/.test(t);
    if (!isHighSignal && !t.startsWith('##')) continue;

    const add = line + '\n';
    if (size + add.length > budget) break;
    kept.push(line);
    size += add.length;
  }

  if (!kept.length) {
    return content.slice(0, budget);
  }

  return kept.join('\n').trim();
}

/**
 * @param {{ componentKey: string, selector: string, type: string }} module
 * @param {string} repoRoot
 */
export function runWorker(module, repoRoot) {
  const flatPath = path.join(repoRoot, 'src', `${module.componentKey}.md`);
  const skillResolved = resolveComponentPath(repoRoot, module.componentKey);
  const sourcePath = skillResolved?.path || flatPath;

  if (!fs.existsSync(sourcePath)) {
    return {
      ok: false,
      module: module.componentKey,
      selector: module.selector,
      error: 'MISSING_REFERENCE',
      expectedPath: sourcePath,
      summary: `[MISSING_REFERENCE] ${module.componentKey} — file not found at ${sourcePath}`,
    };
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const summary = condenseContent(content);

  return {
    ok: true,
    module: module.componentKey,
    selector: module.selector,
    type: module.type,
    sourcePath,
    summary,
    summaryChars: summary.length,
    withinBudget: summary.length <= SUMMARY_CHAR_BUDGET,
  };
}

/**
 * Run workers for all modules — each reads only its own file.
 */
export function runWorkers(modules, repoRoot) {
  return modules.map(mod => runWorker(mod, repoRoot));
}
