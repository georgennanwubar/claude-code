#!/usr/bin/env node
// elisys-lean PreCompact: append one line per compaction so the usage report can count them.
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, watParts, readStdinJson } from './common.mjs';

try {
  const evt = await readStdinJson();
  const line = { at: watParts().iso, session_id: evt?.session_id ?? null, trigger: evt?.trigger ?? null, cwd: evt?.cwd ?? null };
  appendFileSync(join(dataDir(), 'compactions.jsonl'), JSON.stringify(line) + '\n');
} catch { /* fail open */ }
process.exit(0);
