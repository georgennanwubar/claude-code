#!/usr/bin/env node
// elisys-lean PostToolUse(Bash): when a noisy command (pnpm, vitest, turbo, tsc, docker, terraform...)
// returns a long successful result, save the full output to a log file and hand Claude a digest:
// the first lines, every failure/summary line, and the last lines, plus the log path.
// The command has already run: exit status, files and side effects are untouched.
// Opt out per command by adding the shell comment  # lean:raw  or for a session with ELISYS_LEAN_OFF=1.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, watParts, readStdinJson, stripAnsi } from './common.mjs';

const THRESHOLD = Number(process.env.ELISYS_LEAN_THRESHOLD || 6000); // chars
const HEAD = 15, TAIL = 30, MAX_SIGNAL = 60, MAX_LINE = 300, MAX_DIGEST = 7000;
const NOISY = /(^|[\s;&|(])(pnpm|npm|npx|yarn|turbo|vitest|jest|tsc|eslint|prisma|docker|terraform|gcloud|k6|playwright|expo|next)(\s|$)/;
const SIGNAL = /(FAIL|ERROR|ERR!|ERR_|Error:|error TS\d+|AssertionError|Unhandled|panic|ELIFECYCLE|✗|×|✖|Test Files|Tests +\d|Snapshots +\d|\bfailed\b|WARN|Warning:|Tasks: +\d|Cached: +\d|exit code|Exit status)/;

function clip(line) { return line.length > MAX_LINE ? line.slice(0, MAX_LINE) + ' …' : line; }

function digest(text, logPath, label) {
  const lines = stripAnsi(text).split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const head = lines.slice(0, HEAD).map(clip);
  const tailStart = Math.max(HEAD, lines.length - TAIL);
  const tail = lines.slice(tailStart).map(clip);
  const seen = new Set();
  const signal = [];
  let signalTotal = 0;
  for (let i = HEAD; i < tailStart; i++) {
    const l = lines[i];
    if (!SIGNAL.test(l)) continue;
    signalTotal++;
    const key = l.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    if (signal.length < MAX_SIGNAL) signal.push(`L${i + 1}: ${clip(l)}`);
  }
  let out = [
    `[elisys-lean] Long ${label} digested: ${lines.length} lines, ${text.length} chars. Exit status and side effects unchanged.`,
    `Full log: ${logPath}`,
    `For more: grep -n 'PATTERN' ${logPath}   or   sed -n 'A,Bp' ${logPath}`,
    '',
    `── first ${head.length} lines ──`, ...head,
    '',
    `── failure and summary lines in between (${signal.length} shown of ${signalTotal}) ──`, ...(signal.length ? signal : ['(none)']),
    '',
    `── last ${tail.length} lines ──`, ...tail,
  ].join('\n');
  if (out.length > MAX_DIGEST) out = out.slice(0, MAX_DIGEST) + `\n[elisys-lean] digest capped; read the full log above.`;
  return out;
}

try {
  const evt = await readStdinJson();
  if (!evt || evt.tool_name !== 'Bash') process.exit(0);
  if (process.env.ELISYS_LEAN_OFF === '1') process.exit(0);
  const cmd = String(evt.tool_input?.command ?? '');
  if (/#\s*lean:raw\b/.test(cmd) || !NOISY.test(cmd)) process.exit(0);
  const resp = evt.tool_response;
  if (!resp || typeof resp !== 'object' || typeof resp.stdout !== 'string' || resp.isImage) process.exit(0);
  const stdout = resp.stdout;
  const stderr = typeof resp.stderr === 'string' ? resp.stderr : '';
  if (stdout.length + stderr.length <= THRESHOLD) process.exit(0);

  const w = watParts();
  const dir = join(dataDir(), 'logs', w.date);
  mkdirSync(dir, { recursive: true });
  const sid = String(evt.session_id || 'nosession').slice(0, 8);
  const logPath = join(dir, `${w.time}-${sid}-${process.pid}.log`);
  writeFileSync(logPath,
    `# elisys-lean full output\n# when: ${w.iso}\n# cwd: ${evt.cwd || ''}\n# command: ${cmd}\n\n` +
    `===== STDOUT =====\n${stdout}\n\n===== STDERR =====\n${stderr}\n`, { mode: 0o600 });

  const updated = { ...resp };
  updated.stdout = stdout.length > THRESHOLD / 2 ? digest(stdout, logPath, 'stdout') : stdout;
  updated.stderr = stderr.length > 2000 ? digest(stderr, logPath, 'stderr') : stderr;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: updated },
  }));
} catch {
  // fail open
}
process.exit(0);
