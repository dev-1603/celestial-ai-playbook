#!/usr/bin/env node
/**
 * One-time migration helper: adds YAML frontmatter to role files missing it.
 * Safe to re-run — skips files that already have frontmatter.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROLES_DIR = path.join(__dirname, '..', 'src', 'roles');

const ROLE_META = {
  'ai-ml-specialist': { title: 'AI/ML Specialist', command: 'celestial-ai-ml', triggers: ['model', 'inference', 'training', 'ml', 'ai', 'pytorch', 'tensorflow', 'embedding', 'fine-tune', 'llm', 'prompt', 'vector', 'evaluation'] },
  'data-engineer': { title: 'Data Engineer', command: 'celestial-data-engineer', triggers: ['pipeline', 'etl', 'data', 'ingestion', 'transformation', 'airflow', 'spark', 'dbt', 'kafka', 'streaming', 'batch'] },
  'devops': { title: 'DevOps Engineer', command: 'celestial-devops', triggers: ['deploy', 'ci', 'cd', 'docker', 'k8s', 'kubernetes', 'terraform', 'pipeline', 'monitoring', 'infra', 'infrastructure', 'helm', 'github-actions'] },
  'dba': { title: 'Database Administrator', command: 'celestial-dba', triggers: ['schema', 'migration', 'index', 'sql', 'query', 'query-plan', 'table', 'rls', 'database', 'prisma', 'orm', 'postgres'] },
  'ui-ux': { title: 'UI/UX Designer', command: 'celestial-ui-ux', triggers: ['ui', 'ux', 'design', 'figma', 'wireframe', 'responsive', 'accessibility', 'component', 'mobile', 'layout'] },
  'go-engineer': { title: 'Go Engineer', command: 'celestial-go', triggers: ['go', 'golang', 'goroutine', 'gRPC', 'concurrency', 'channel', 'interface', 'context'] },
  'frontend': { title: 'Frontend Developer', command: 'celestial-frontend', triggers: ['react', 'vue', 'frontend', 'component', 'state', 'ui', 'browser', 'css'] },
  'system-architect': { title: 'System Architect', command: 'celestial-architect', triggers: ['architecture', 'design', 'system', 'architect', 'rfc', 'adr', 'trade-off', 'diagram'] },
  'end-user': { title: 'End User Advocate', command: 'celestial-end-user', triggers: ['user', 'client', 'customer', 'persona', 'usability', 'end-user'] },
  'pr-reviewer': { title: 'PR Reviewer', command: 'celestial-review-pr', triggers: ['review', 'pr', 'pull request', 'code review'] },
};

function stripLegacyHeader(content) {
  return content
    .replace(/^# ROLE:.+\n/m, '')
    .replace(/^@trigger\s+.+\n/m, '')
    .replace(/^@priority\s+\d+\n/m, '')
    .replace(/^\n---\n\n/m, '')
    .trimStart();
}

function buildFrontmatter(slug, meta) {
  const desc = meta.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 80);
  return `---
id: roles/${slug}
kind: role
name: ${slug}
title: ${meta.title}
description: ${desc}
command: ${meta.command}
scope: global
type: command
triggers: [${meta.triggers.join(', ')}]
token_budget: 800
targets:
  cursor: { enabled: true, type: command }
  claude: { enabled: true, type: command }
  copilot: { enabled: true, type: prompt }
  antigravity: { enabled: true, type: preset }
---

`;
}

let updated = 0;
for (const [slug, meta] of Object.entries(ROLE_META)) {
  const filePath = path.join(ROLES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) continue;

  const raw = fs.readFileSync(filePath, 'utf-8');
  if (raw.startsWith('---')) {
    if (slug === 'pr-reviewer') {
      const fixed = raw.replace(/command: celestial-pr-reviewer/, 'command: celestial-review-pr');
      if (fixed !== raw) {
        fs.writeFileSync(filePath, fixed);
        console.log(`Fixed command: ${slug}`);
        updated++;
      }
    }
    continue;
  }

  const body = stripLegacyHeader(raw);
  fs.writeFileSync(filePath, buildFrontmatter(slug, meta) + body);
  console.log(`Added frontmatter: ${slug}`);
  updated++;
}

console.log(`Done. Updated ${updated} file(s).`);
