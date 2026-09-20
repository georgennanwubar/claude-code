#!/usr/bin/env node
// Adds the elisys-lean status line to ~/.claude/settings.json only when no status line is set.
// Backs the file up first. Never overwrites someone else's status line.
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const dir = join(homedir(), '.claude');
const file = join(dir, 'settings.json');
const cmd = `node ${join(dir, 'skills', 'elisys-lean', 'scripts', 'statusline.mjs')}`;
mkdirSync(dir, { recursive: true });

let settings = {};
if (existsSync(file)) {
  try { settings = JSON.parse(readFileSync(file, 'utf8')); }
  catch { console.log('  status line: settings.json is not plain JSON, left untouched. Add it by hand (see README).'); process.exit(0); }
}
if (settings.statusLine && !String(settings.statusLine.command || '').includes('elisys-lean')) {
  console.log('  status line: you already have one, left untouched. See README to switch.');
  process.exit(0);
}
if (existsSync(file)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = join(dir, 'elisys-lean-backups', `settings.json.${stamp}`);
  mkdirSync(join(dir, 'elisys-lean-backups'), { recursive: true });
  copyFileSync(file, backup);
  console.log(`  status line: settings backed up to ${backup}`);
}
settings.statusLine = { type: 'command', command: cmd, padding: 0 };
writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
console.log('  status line: installed');
