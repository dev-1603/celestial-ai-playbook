#!/usr/bin/env node

import assert from 'node:assert/strict';
import { parseMarkdown, parseMarkdownFile, FrontmatterParseError } from './lib/frontmatter.mjs';

let failures = 0;

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  failures++;
}

function test(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
}

function expectError(name, fn, expectedMessagePart) {
  try {
    fn();
    fail(`${name}: expected FrontmatterParseError`);
  } catch (err) {
    if (!(err instanceof FrontmatterParseError)) {
      fail(`${name}: expected FrontmatterParseError, got ${err.name}`);
      return;
    }
    if (expectedMessagePart && !err.message.includes(expectedMessagePart)) {
      fail(`${name}: expected message containing "${expectedMessagePart}", got "${err.message}"`);
      return;
    }
    pass(name);
  }
}

test('returns empty meta when frontmatter is absent', () => {
  const input = '# Title\n\nBody content';
  const parsed = parseMarkdown(input);

  assert.deepEqual(parsed.meta, {});
  assert.equal(parsed.body, input);
  assert.equal(parsed.raw, input);
  assert.equal(parsed.sourcePath, null);
});

test('parses valid frontmatter and preserves body', () => {
  const input = `---
title: Backend Developer
command: celestial-backend
triggers: [api, controller, service]
priority: 90
enabled: true
---

# ROLE: Backend Developer

Body here.`;

  const parsed = parseMarkdown(input, { sourcePath: 'src/roles/backend.md' });

  assert.equal(parsed.meta.title, 'Backend Developer');
  assert.equal(parsed.meta.command, 'celestial-backend');
  assert.deepEqual(parsed.meta.triggers, ['api', 'controller', 'service']);
  assert.equal(parsed.meta.priority, 90);
  assert.equal(parsed.meta.enabled, true);
  assert.match(parsed.body, /^# ROLE: Backend Developer/);
  assert.equal(parsed.sourcePath, 'src/roles/backend.md');
});

test('allows empty frontmatter block', () => {
  const input = `---
---

# Body only`;

  const parsed = parseMarkdown(input);
  assert.deepEqual(parsed.meta, {});
  assert.match(parsed.body, /^# Body only/);
});

test('parses quoted scalar values', () => {
  const input = `---
description: "Use for api, controller, and service work"
---

Body`;

  const parsed = parseMarkdown(input);
  assert.equal(parsed.meta.description, 'Use for api, controller, and service work');
});

expectError(
  'fails on unclosed frontmatter fence',
  () => parseMarkdown('---\ntitle: Missing closing fence\nBody'),
  'not closed'
);

expectError(
  'fails on invalid frontmatter line',
  () => parseMarkdown('---\nnot-a-valid-line\n---\nBody'),
  'Invalid frontmatter line'
);

expectError(
  'fails on duplicate keys',
  () => parseMarkdown('---\ntitle: One\ntitle: Two\n---\nBody'),
  'Duplicate frontmatter key'
);

expectError(
  'fails on malformed array',
  () => parseMarkdown('---\ntriggers: [api, controller\n---\nBody'),
  'Malformed array value'
);

test('parseMarkdownFile reads role source without frontmatter', () => {
  const parsed = parseMarkdownFile('src/roles/backend.md');
  assert.deepEqual(parsed.meta, {});
  assert.match(parsed.body, /^# ROLE: Backend Developer/);
  assert.equal(parsed.sourcePath, 'src/roles/backend.md');
});

console.log(`\n${failures === 0 ? '✅ All frontmatter checks passed' : `❌ ${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
