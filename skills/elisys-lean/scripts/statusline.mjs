#!/usr/bin/env node
// elisys-lean status line: model·effort │ context tokens │ plan windows │ cache.
// v1.1.2: Claude Code's feed carries ONE weekly window, but a Max account has two weekly
// gauges (Fable, and every other model). Measured 2026-09-21: the feed's seven_day is scoped to
// the model the session runs on. So the status line keeps a snapshot per model family and shows
// the live weekly gauge for this session's family PLUS the last-seen gauge for the other family,
// with its age. Set ELISYS_LEAN_SCOPED_7D=0 to turn the split off if /usage shows the feed is
// not model-scoped. Runs locally; consumes no API tokens; fails open.
import { writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, watParts } from './common.mjs';

const SCOPED = process.env.ELISYS_LEAN_SCOPED_7D !== '0';
const familyOf = id => (/fable|mythos/i.test(id || '') ? 'fable' : 'other');

let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  let d = {};
  try { d = JSON.parse(raw); } catch { /* print a bare line */ }
  const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', C = '\x1b[36m', D = '\x1b[2m', X = '\x1b[0m';
  const k = n => (n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : Math.round(n / 1e3) + 'k');
  const col = v => (v >= 85 ? R : v >= 60 ? Y : G);
  const parts = [];

  const modelId = d.model?.id || '';
  const family = familyOf(modelId);
  const other = family === 'fable' ? 'other' : 'fable';
  const model = d.model?.display_name || modelId || '?';
  const effort = d.effort?.level ? `·${d.effort.level}` : '';
  parts.push(`${C}${model}${effort}${X}`);

  const used = d.context_window?.total_input_tokens || 0;
  const size = d.context_window?.context_window_size || 0;
  if (size) {
    const c = used >= 400e3 ? R : used >= 250e3 ? Y : G;
    const pct = Math.min(100, Math.round((used / size) * 100));
    const filled = Math.round(pct / 10);
    parts.push(`ctx ${c}${k(used)}${X}/${k(size)} ${c}${'█'.repeat(filled)}${D}${'░'.repeat(10 - filled)}${X}`);
  }

  // Every window in the feed, data-driven. The weekly one is labelled by this session's family.
  const rl = d.rate_limits || {};
  const label = key => {
    const base = key.replace('five_hour', '5h').replace('seven_day', '7d').replace(/_/g, '·');
    return key === 'seven_day' && SCOPED ? `${base}·${family}` : base;
  };
  const rank = key => (key.startsWith('five_hour') ? 0 : key.startsWith('seven_day') ? 1 : 2);
  for (const key of Object.keys(rl).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) {
    const v = rl[key]?.used_percentage;
    if (v == null) continue;
    parts.push(`${label(key)} ${col(v)}${Math.round(v)}%${X}`);
  }

  // The other family's weekly gauge, from its last snapshot, with age.
  if (SCOPED && rl.seven_day) {
    try {
      const f = join(dataDir(), `rate-limits-${other}.json`);
      const snap = JSON.parse(readFileSync(f, 'utf8'));
      const v = snap?.rate_limits?.seven_day?.used_percentage;
      if (v != null) {
        const ageMin = Math.max(0, Math.round((Date.now() - statSync(f).mtimeMs) / 60e3));
        const age = ageMin < 60 ? `${ageMin}m` : ageMin < 1440 ? `${Math.round(ageMin / 60)}h` : `${Math.round(ageMin / 1440)}d`;
        parts.push(`7d·${other} ${col(v)}${Math.round(v)}%${X}${D}(${age})${X}`);
      }
    } catch { /* no snapshot for the other family yet */ }
  }

  const cache = d.prompt_cache;
  if (cache && cache.caching_observed) parts.push(cache.warm ? `${G}cache warm${X}` : `${Y}cache cold${X}`);

  process.stdout.write(parts.join(' │ ') + '\n');

  // Snapshots: the general one (as before) and one per model family. At most once a minute each.
  try {
    if (Object.keys(rl).length) {
      const body = JSON.stringify({ at: watParts().iso, model: modelId || null, family, rate_limits: rl }) + '\n';
      for (const name of ['rate-limits.json', `rate-limits-${family}.json`]) {
        const f = join(dataDir(), name);
        let stale = true;
        try { stale = Date.now() - statSync(f).mtimeMs > 60e3; } catch { /* absent: write it */ }
        if (stale) writeFileSync(f, body);
      }
    }
  } catch { /* fail open */ }
});
