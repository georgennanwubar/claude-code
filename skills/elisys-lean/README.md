# elisys-lean

A personal Claude Code plugin that cuts token burn on the Elisys monorepo. It installs under
`~/.claude/skills/elisys-lean/` and loads automatically as `elisys-lean@skills-dir`. Nothing is
written into the repository, so no governed path is touched and no PR is needed.

## What it does

| Part | What it changes | Tokens saved |
|---|---|---|
| Output digest (PostToolUse on Bash) | A long successful result from pnpm, vitest, turbo, tsc, eslint, prisma, docker, terraform, gcloud or k6 is saved to a log file. Claude sees the first 15 lines, every failure and summary line, the last 30 lines and the log path. | A 30k-character test run becomes about 3–5k, and it stays out of every later step of the session |
| Session note (SessionStart) | One short paragraph telling the session how digests work. Also deletes digest logs older than 7 days. | Small cost, about 80 tokens |
| Compaction log (PreCompact) | One line per compaction in `compactions.jsonl`, so you can count them. | Measurement only |
| Status line | `Opus·high │ ctx 312k/1M ██░░ │ 5h 22% │ 7d 64% │ 7d·fable 41% │ cache warm`. Every plan window Claude Code reports is shown, model-specific weekly windows included. Context turns yellow at 250k and red at 400k. | Lets you see a bloated session before it eats the week |
| `elisys-usage` | Reads local transcripts and prints plan-limit percentages (from the status line's snapshot), per-model usage since the weekly reset (Sunday 01:00 WAT), tokens per session and per model, average context per request, compactions and subagents. Counts only. | Free: runs in your shell, not in Claude |
| `/elisys-lean:handoff` | Appends a short HANDOFF block to the session log after an order closes, so the next order can start fresh. | Avoids carrying one order's context into the next |
| `/elisys-lean:usage-report` | Asks Claude to run `elisys-usage` and name the biggest driver. You invoke it; Claude never auto-loads it. | – |
| Launchers in `~/.bashrc` | `elisys` reads the queue, classifies the waiting orders (docs → Sonnet 5 medium, build → Opus 5 high, deep → Fable 5.1 high, only when an order names it) and launches with the right model and effort; `elisys build\|docs\|deep` overrides; `elisys-build`, `elisys-docs`, `elisys-deep` remain for explicit choice. Every launcher sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, so a subagent George names runs cheap unless its own definition says otherwise. | Model choice, made from the work itself |

## Safety properties

- The digest runs after the command. Exit status, files written and side effects are exactly as they were.
- Failed commands are never rewritten; Claude Code already trims those itself.
- The full output is kept on disk (mode 600) for 7 days, so nothing a close-out needs to quote is lost.
- Every script fails open: on any error it prints nothing and the tool result passes through unchanged.
- Opt out for one command with the shell comment `# lean:raw`, or for a whole session by launching with `ELISYS_LEAN_OFF=1`.
- Tune the digest threshold with `ELISYS_LEAN_THRESHOLD` (characters, default 6000).

## Install, check, remove

```bash
bash install.sh
source ~/.bashrc
claude plugin details elisys-lean@skills-dir
bash ~/.claude/skills/elisys-lean/install.sh --uninstall
```

If you already had a status line, the installer leaves it alone. To use this one, set
`statusLine.command` in `~/.claude/settings.json` to `node ~/.claude/skills/elisys-lean/scripts/statusline.mjs`.

## Changes

- **1.1.1 (20 Sep 2026).** The `--autocompact 350k`/`500k` caps are removed from every launcher.
  They sat below the session gate's own read size (Tier 1 plus a Tier 2 read set is over 1.2 MB),
  so sessions compacted in the middle of their mandatory reading and paid the re-read — twice in
  one measured session. Compaction now happens only at Claude Code's default, near the window's
  end, which a /clear-per-order session mostly never reaches. Compaction is deliberately NOT
  disabled outright: with it off, a filled window stalls an unattended overnight run, and a stall
  costs more than a rare compaction.

- **1.1.0 (20 Sep 2026).** One launcher, `elisys`, picks the model itself: `bin/elisys-pick` reads
  the queue, classifies each waiting order (an explicit "Recommended launch:" line wins; code,
  schema, infra or CI paths mean build; otherwise docs; deep is never inferred, because Fable is
  the scarce budget), launches the strongest class present, and prints its reasoning first. All
  launchers now set `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` so named subagents default to a cheap
  model. One session keeps one model: Claude Code's hooks can observe or veto a model switch but
  cannot make one, so the launch is the selection point, which the /clear-per-order flow already
  makes the task boundary.

- **1.0.2 (20 Sep 2026).** The status line printed only two hardcoded plan windows (`five_hour`,
  `seven_day`), so Fable 5's own weekly window was silently dropped. It now prints every window in
  Claude Code's `rate_limits` feed, whatever its key, and snapshots the feed to `rate-limits.json`
  (at most once a minute) so `elisys-usage` can show the same figures outside a session.
  `elisys-usage` gains the Plan limits section, a per-model table for the current weekly window
  (Sunday 01:00 WAT reset), and an honest note when the feed reports no Fable-specific window.
  Its compaction column no longer double-counts (a compaction writes a boundary event and a summary
  line; both were counted — measured in the order 123 findings). `compactions.jsonl` and the
  snapshot now respect `CLAUDE_PLUGIN_DATA`.
- **1.0.1 (20 Sep 2026).** Rebuild of the validated 16 Sep source with its in-session fixes.
- **1.0.0 (16 Sep 2026).** First build, validated against Claude Code 2.1.273.

## Caveat

`elisys-usage` reads Claude Code's local transcript files, whose format is internal and may change.
The plan-limit percentages come from Claude Code's own status feed, cached by the status line; if a
model's window is missing there, the tool says so rather than inventing a figure. If it reports
"Nothing parsed", use `/usage` inside Claude Code instead.
