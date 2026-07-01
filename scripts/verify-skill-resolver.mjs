#!/usr/bin/env node
/** Verify skill resolver JIT loading behavior. */
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveSkill, estimateTokens, listSkillReferences } from './lib/skill-resolver.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log(`✅ ${name}`); }
  catch (e) { console.error(`❌ ${name}: ${e.message}`); failures++; }
}

test('metadata level does not load skill body', () => {
  const r = resolveSkill(REPO_ROOT, 'skills/performance-tuning', { level: 'metadata' });
  assert.equal(r.ok, true);
  assert.equal(r.skill, null);
  assert.equal(r.reference, null);
  assert.ok(r.metadata.description);
});

test('skill level loads SKILL.md but not references', () => {
  const meta = resolveSkill(REPO_ROOT, 'skills/performance-tuning', { level: 'metadata' });
  const skill = resolveSkill(REPO_ROOT, 'skills/performance-tuning', { level: 'skill' });
  assert.ok(skill.skill.body.includes('Heuristics'));
  assert.equal(skill.reference, null);
  assert.ok(estimateTokens(skill) > estimateTokens(meta));
});

test('reference level loads single reference file', () => {
  const r = resolveSkill(REPO_ROOT, 'skills/performance-tuning', {
    level: 'reference',
    reference: 'database.md',
  });
  assert.equal(r.ok, true);
  assert.ok(r.reference.content.includes('N+1'));
  assert.deepEqual(r.referencesLoaded, ['database.md']);
});

test('missing reference returns MISSING_REFERENCE', () => {
  const r = resolveSkill(REPO_ROOT, 'skills/performance-tuning', {
    level: 'reference',
    reference: 'nonexistent.md',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'MISSING_REFERENCE');
});

test('listSkillReferences returns available files', () => {
  const refs = listSkillReferences(REPO_ROOT, 'skills/performance-tuning');
  assert.ok(refs.includes('database.md'));
  assert.ok(refs.includes('caching.md'));
});

console.log(`\n${failures === 0 ? '✅ All skill resolver checks passed' : `❌ ${failures} failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
