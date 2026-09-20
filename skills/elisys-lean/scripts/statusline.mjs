#!/usr/bin/env node
// elisys-lean status line: model·effort │ context tokens (colour by absolute size) │ EVERY plan window
// Claude Code reports (5h, 7d, and any model-specific weekly window such as Fable's) │ cache.
// v1.0.2: windows are read from the data, never from a hardcoded list, so a bucket Claude Code adds
// can no longer be dropped. Each refresh also snapshots the windows to rate-limits.json (at most once
// a minute) so elisys-usage can show them outside a session. Runs locally; consumes no API tokens.
import { writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, watParts } from './common.mjs';

let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  let d = {};
  try { d = JSON.parse(raw); } catch { /* print a bare line */ }
  const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', C = '\x1b[36m', D = '\x1b[2m', X = '\x1b[0m';
  const k = n => (n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : Math.round(n / 1e3) + 'k');
  const parts = [];

  const model = d.model?.display_name || d.model?.id || '?';
  const effort = d.effort?.level ? `·${d.effort.level}` : '';
  parts.push(`${C}${model}${effort}${X}`);

  const used = d.context_window?.total_input_tokens || 0;
  const size = d.context_window?.context_window_size || 0;
  if (size) {
    const col = used >= 400e3 ? R : used >= 250e3 ? Y : G;
    const pct = Math.min(100, Math.round((used / size) * 100));
    const filled = Math.round(pct / 10);
    parts.push(`ctx ${col}${k(used)}${X}/${k(size)} ${col}${'█'.repeat(filled)}${D}${'░'.repeat(10 - filled)}${X}`);
  }

  const rl = d.rate_limits || {};
  const label = key => key.replace('five_hour', '5h').replace('seven_day', '7d').replace(/_/g, '·');
  const rank = key => key.startsWith('five_hour') ? 0 : key.startsWith('seven_day') ? 1 : 2;
  for (const key of Object.keys(rl).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) {
    const v = rl[key]?.used_percentage;
    if (v == null) continue;
    const col = v >= 85 ? R : v >= 60 ? Y : G;
    parts.push(`${label(key)} ${col}${Math.round(v)}%${X}`);
  }

  const cache = d.prompt_cache;
  if (cache && cache.caching_observed) parts.push(cache.warm ? `${G}cache warm${X}` : `${Y}cache cold${X}`);

  process.stdout.write(parts.join(' │ ') + '\n');

  // Snapshot the plan windows for elisys-usage. Fail open; never break the status line.
  try {
    if (Object.keys(rl).length) {
      const f = join(dataDir(), 'rate-limits.json');
      let stale = true;
      try { stale = Date.now() - statSync(f).mtimeMs > 60e3; } catch { /* absent: write it */ }
      if (stale) writeFileSync(f, JSON.stringify({ at: watParts().iso, model: d.model?.id || null, rate_limits: rl }) + '\n');
    }
  } catch { /* fail open */ }
});
