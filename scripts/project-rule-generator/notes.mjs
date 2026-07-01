/**
 * Notes — persist worker summaries for auditability and context compaction.
 */
import fs from 'fs';
import path from 'path';

export function notesPath(projectDir) {
  return path.join(path.resolve(projectDir), '.ai-playbook', 'generate-notes.md');
}

export function appendWorkerNotes(projectDir, workerResults) {
  const filePath = notesPath(projectDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const timestamp = new Date().toISOString();
  const blocks = workerResults.map(w => {
    const header = `## ${w.module} (${w.selector}) — ${timestamp}`;
    const meta = w.ok
      ? `source: ${w.sourcePath}\nchars: ${w.summaryChars}\nwithinBudget: ${w.withinBudget}`
      : `error: ${w.error}\nexpected: ${w.expectedPath || 'n/a'}`;
    return `${header}\n\n${meta}\n\n${w.summary || w.error}\n`;
  });

  const entry = `\n---\n\n# Generation Run — ${timestamp}\n\n${blocks.join('\n---\n\n')}\n`;
  fs.appendFileSync(filePath, entry);
  return filePath;
}

export function readLatestNotes(projectDir) {
  const filePath = notesPath(projectDir);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}
