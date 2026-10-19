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

// v1.1.7 (ELISYS-876): plan-limit snapshots are per ACCOUNT, never shared. Lane 2's folder links
// `plugins` to lane 1's, so the plugin data directory is one directory for both lanes and a
// snapshot kept there was overwritten by whichever lane rendered last. The account is identified
// by its Claude Code config folder (CLAUDE_CONFIG_DIR; unset means ~/.claude), and each folder
// keeps its own snapshots in `<config folder>/elisys-lean-limits/`, which no link points at.
export function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
}

export function limitsDir(config = configDir()) {
  const dir = join(config, 'elisys-lean-limits');
  try { mkdirSync(dir, { recursive: true }); return dir; }
  catch { return dir; } // read-only callers still get the path; a write simply fails open
}

// A weekly gauge can be live only for the model family this session runs on, because Claude Code's
// feed carries one seven_day window scoped to that family (measured 2026-09-21). The other family's
// gauge comes from the last session of that family on this account: LIVE_MAX_MIN old at most to be
// shown as a reading, anything older is stale and says "not live". A snapshot whose window has
// already reset describes a week that is over, so its percentage is withheld.
export const LIVE_MAX_MIN = 10;

export function gaugeState(snap, nowMs = Date.now()) {
  const sd = snap?.rate_limits?.seven_day;
  const pct = sd?.used_percentage;
  if (pct == null) return { state: 'none' };
  const seen = Date.parse(snap.at || '');
  const ageMin = Number.isFinite(seen) ? Math.max(0, Math.round((nowMs - seen) / 60e3)) : null;
  const resetMs = typeof sd.resets_at === 'number' ? sd.resets_at * 1000 : null;
  if (resetMs != null && resetMs <= nowMs) return { state: 'rolled', pct, ageMin };
  if (ageMin == null || ageMin > LIVE_MAX_MIN) return { state: 'stale', pct, ageMin };
  return { state: 'recent', pct, ageMin };
}

export function formatAge(ageMin) {
  if (ageMin == null) return 'age unknown';
  return ageMin < 60 ? `${ageMin}m` : ageMin < 1440 ? `${Math.round(ageMin / 60)}h` : `${Math.round(ageMin / 1440)}d`;
}
