#!/usr/bin/env node
// elisys-lean SessionStart: prune digest logs older than 7 days and add one short context note.
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir } from './common.mjs';

try {
  const logs = join(dataDir(), 'logs');
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  for (const d of readdirSync(logs)) {
    const p = join(logs, d);
    if (statSync(p).mtimeMs < cutoff) rmSync(p, { recursive: true, force: true });
  }
} catch { /* no logs yet */ }

const note = [
  'elisys-lean is active.',
  'Long output from build, test, lint and infra commands arrives as a digest with a full-log path; read the log with grep or sed ranges when you need more, and add "# lean:raw" to a command only when the full inline output is essential.',
  'Outside files a session gate requires in full, prefer grep -n and ranged reads over whole-file reads of large files.',
].join(' ');
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: note } }));
process.exit(0);
