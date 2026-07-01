/**
 * Generic markdown frontmatter parser for playbook source files.
 * Reusable for roles, skills, and other markdown modules.
 */

import fs from 'fs';

export class FrontmatterParseError extends Error {
  constructor(message, { sourcePath, line, column } = {}) {
    const location = [];
    if (sourcePath) location.push(sourcePath);
    if (line != null) location.push(`line ${line}`);
    if (column != null) location.push(`column ${column}`);

    const prefix = location.length ? `[${location.join(', ')}] ` : '';
    super(`${prefix}${message}`);
    this.name = 'FrontmatterParseError';
    this.sourcePath = sourcePath;
    this.line = line;
    this.column = column;
  }
}

function stripBom(content) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

function splitFrontmatter(content) {
  const normalized = stripBom(content);

  if (!normalized.startsWith('---')) {
    return { hasFrontmatter: false, yaml: '', body: normalized };
  }

  const lines = normalized.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { hasFrontmatter: false, yaml: '', body: normalized };
  }

  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closeIndex = i;
      break;
    }
  }

  if (closeIndex === -1) {
    throw new FrontmatterParseError(
      'Frontmatter opening fence is not closed with a matching --- line'
    );
  }

  const yaml = lines.slice(1, closeIndex).join('\n');
  let body = lines.slice(closeIndex + 1).join('\n');
  if (body.startsWith('\r\n')) body = body.slice(2);
  else if (body.startsWith('\n')) body = body.slice(1);

  return { hasFrontmatter: true, yaml, body };
}

function parseScalar(raw, { sourcePath, line }) {
  const value = raw.trim();

  if (value === '') {
    throw new FrontmatterParseError('Missing value after key', { sourcePath, line });
  }

  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;

  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') || value.startsWith("'")) {
    throw new FrontmatterParseError(`Unclosed quoted value: ${value}`, { sourcePath, line });
  }

  if (value.startsWith('[')) {
    throw new FrontmatterParseError(`Malformed array value: ${value}`, { sourcePath, line });
  }

  if (value.includes(':') && !value.startsWith('"') && !value.startsWith("'")) {
    throw new FrontmatterParseError(`Invalid unquoted scalar value: ${value}`, { sourcePath, line });
  }

  return value;
}

function parseInlineArray(raw, { sourcePath, line }) {
  const value = raw.trim();

  if (!value.startsWith('[') || !value.endsWith(']')) {
    throw new FrontmatterParseError(`Malformed array value: ${value}`, { sourcePath, line });
  }

  const inner = value.slice(1, -1).trim();
  if (!inner) return [];

  const items = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];

    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === ',') {
      items.push(parseScalar(current, { sourcePath, line }));
      current = '';
      continue;
    }

    current += ch;
  }

  if (quote) {
    throw new FrontmatterParseError(`Unclosed quote in array: ${value}`, { sourcePath, line });
  }

  if (current.trim()) {
    items.push(parseScalar(current, { sourcePath, line }));
  }

  return items;
}

function getIndent(text) {
  const m = text.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

/**
 * Recursively parse a list of { text, lineNumber } entries at `expectedIndent`.
 * Returns [resultObject, nextIndex].
 */
function parseBlock(lines, startIdx, expectedIndent, { sourcePath }) {
  const result = {};
  let i = startIdx;

  while (i < lines.length) {
    const { text, lineNumber } = lines[i];
    const indent = getIndent(text);

    if (indent < expectedIndent) break;        // belongs to parent block
    if (indent > expectedIndent) {
      throw new FrontmatterParseError('Unexpected indentation', { sourcePath, line: lineNumber });
    }

    const colonIdx = text.indexOf(':');
    if (colonIdx === -1) {
      throw new FrontmatterParseError(`Invalid frontmatter line: ${text.trim()}`, { sourcePath, line: lineNumber });
    }

    const key = text.slice(indent, colonIdx).trim();
    const rawValue = text.slice(colonIdx + 1);
    const trimmedValue = rawValue.trim();

    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      throw new FrontmatterParseError(`Invalid frontmatter key: ${key}`, { sourcePath, line: lineNumber });
    }
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new FrontmatterParseError(`Duplicate frontmatter key: ${key}`, { sourcePath, line: lineNumber });
    }

    i++; // advance past current key line

    if (!trimmedValue) {
      // Empty value — check whether next lines are deeper (nested object)
      if (i < lines.length && getIndent(lines[i].text) > expectedIndent) {
        const childIndent = getIndent(lines[i].text);
        const childLines = [];
        while (i < lines.length && getIndent(lines[i].text) >= childIndent) {
          childLines.push(lines[i]);
          i++;
        }
        const [nested] = parseBlock(childLines, 0, childIndent, { sourcePath });
        result[key] = nested;
        continue;
      }
      result[key] = null;
      continue;
    }

    if (trimmedValue.startsWith('[')) {
      result[key] = parseInlineArray(trimmedValue, { sourcePath, line: lineNumber });
    } else {
      result[key] = parseScalar(rawValue, { sourcePath, line: lineNumber });
    }
  }

  return [result, i];
}

function parseYamlBlock(yaml, { sourcePath } = {}) {
  if (!yaml.trim()) return {};

  const lines = yaml
    .split(/\r?\n/)
    .map((text, idx) => ({ text, lineNumber: idx + 1 }))
    .filter(({ text }) => text.trim() !== '' && !text.trim().startsWith('#'));

  const [meta] = parseBlock(lines, 0, 0, { sourcePath });
  return meta;
}

/**
 * Parse markdown content into normalized { meta, body, raw, sourcePath }.
 *
 * @param {string} content
 * @param {{ sourcePath?: string }} [options]
 * @returns {{ meta: Record<string, unknown>, body: string, raw: string, sourcePath: string | null }}
 */
export function parseMarkdown(content, { sourcePath = null } = {}) {
  if (typeof content !== 'string') {
    throw new FrontmatterParseError('Expected markdown content to be a string', { sourcePath });
  }

  const raw = content;
  const { hasFrontmatter, yaml, body } = splitFrontmatter(content);

  if (!hasFrontmatter) {
    return {
      meta: {},
      body,
      raw,
      sourcePath,
    };
  }

  return {
    meta: parseYamlBlock(yaml, { sourcePath }),
    body,
    raw,
    sourcePath,
  };
}

/**
 * Read and parse a markdown file from disk.
 *
 * @param {string} sourcePath
 * @returns {{ meta: Record<string, unknown>, body: string, raw: string, sourcePath: string }}
 */
export function parseMarkdownFile(sourcePath) {
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new FrontmatterParseError('sourcePath is required');
  }

  if (!fs.existsSync(sourcePath)) {
    throw new FrontmatterParseError(`File not found: ${sourcePath}`, { sourcePath });
  }

  const raw = fs.readFileSync(sourcePath, 'utf-8');
  return parseMarkdown(raw, { sourcePath });
}

/**
 * Example helper for ad-hoc inspection during development.
 *
 * Usage:
 *   node --input-type=module -e "import { exampleUsage } from './scripts/lib/frontmatter.mjs'; exampleUsage('src/roles/backend.md')"
 */
export function exampleUsage(sourcePath) {
  const parsed = parseMarkdownFile(sourcePath);
  return {
    sourcePath: parsed.sourcePath,
    metaKeys: Object.keys(parsed.meta),
    meta: parsed.meta,
    bodyPreview: parsed.body.split('\n').slice(0, 5).join('\n'),
  };
}
