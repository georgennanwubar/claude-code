#!/usr/bin/env node
// elisys-lean status line: model·effort │ context tokens (colour by absolute size) │ 5h and 7d plan use │ cache.
// Runs locally; consumes no API tokens.
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
  const pc = (w, label) => {
    const v = rl[w]?.used_percentage;
    if (v == null) return;
    const col = v >= 85 ? R : v >= 60 ? Y : G;
    parts.push(`${label} ${col}${Math.round(v)}%${X}`);
  };
  pc('five_hour', '5h');
  pc('seven_day', '7d');

  const cache = d.prompt_cache;
  if (cache && cache.caching_observed) parts.push(cache.warm ? `${G}cache warm${X}` : `${Y}cache cold${X}`);

  process.stdout.write(parts.join(' │ ') + '\n');
});
