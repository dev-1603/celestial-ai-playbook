#!/usr/bin/env node
/** Adds YAML frontmatter to skill files and restructures for micro-skill split headers. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '..', 'src', 'skills');

const SKILL_META = {
  'observability': {
    description: 'Structured logging, tracing, metrics, alerting, SLOs',
    triggers: ['observability', 'logging', 'tracing', 'metrics', 'alerting', 'slo'],
    sections: ['## Logging', '## Tracing', '## Metrics', '## Alerting'],
  },
  'threat-modeling': {
    description: 'STRIDE-style threat modeling and security analysis',
    triggers: ['threat', 'stride', 'security', 'attack surface'],
    sections: ['## STRIDE', '## Mitigations'],
  },
  'domain-driven-design': {
    description: 'Bounded contexts, aggregates, domain events, ubiquitous language',
    triggers: ['ddd', 'bounded context', 'aggregate', 'domain event'],
    sections: ['## Modeling', '## Boundaries', '## Events'],
  },
  'performance-tuning': {
    description: 'N+1 queries, caching, latency, throughput optimization',
    triggers: ['performance', 'slow', 'optimize', 'latency', 'n+1', 'cache'],
    sections: ['## Database', '## Caching', '## Application'],
  },
};

function stripLegacy(content) {
  return content
    .replace(/^# SKILL:.+\n/m, '')
    .replace(/^@trigger\s+.+\n/m, '')
    .replace(/^@priority\s+\d+\n/m, '')
    .trimStart();
}

function buildFrontmatter(slug, meta) {
  return `---
name: celestial-${slug}
description: ${meta.description}
scope: global
type: skill
triggers: [${meta.triggers.join(', ')}]
token_budget: 400
references:
  - references/overview.md
---

`;
}

for (const [slug, meta] of Object.entries(SKILL_META)) {
  const filePath = path.join(SKILLS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) continue;

  const raw = fs.readFileSync(filePath, 'utf-8');
  if (raw.startsWith('---') && raw.includes('type: skill')) continue;

  let body = stripLegacy(raw);
  if (meta.sections && !body.includes('## Logging') && slug === 'observability') {
    body = meta.sections.map(s => `${s}\n\n- Deferred — see references/overview.md\n`).join('\n');
  }

  fs.writeFileSync(filePath, buildFrontmatter(slug, meta) + body);
  console.log(`Updated skill: ${slug}`);
}

console.log('Skill frontmatter migration complete.');
