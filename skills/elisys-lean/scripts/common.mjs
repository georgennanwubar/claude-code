// Shared helpers for elisys-lean hook scripts. Every script fails open:
// if anything goes wrong it prints nothing and exits 0, so a tool call is never broken.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

export function dataDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA
    || join(homedir(), '.claude', 'plugins', 'data', 'elisys-lean-skills-dir');
  try { mkdirSync(base, { recursive: true }); return base; }
  catch { const t = join(tmpdir(), 'elisys-lean'); mkdirSync(t, { recursive: true }); return t; }
}

// Wall-clock parts in Africa/Lagos (WAT), for file names and log lines.
export function watParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}${p.minute}${p.second}`,
           iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+01:00` };
}

export async function readStdinJson() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw); } catch { return null; }
}

export function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}
