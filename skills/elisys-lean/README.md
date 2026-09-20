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
| Status line | `Opus·high │ ctx 312k/1M ██░░ │ 5h 22% │ 7d 64% │ cache warm`. Context turns yellow at 250k and red at 400k. | Lets you see a bloated session before it eats the week |
| `elisys-usage` | Reads local transcripts and prints tokens per session and per model, average context per request, compactions and subagents. Counts only. | Free: runs in your shell, not in Claude |
| `/elisys-lean:handoff` | Appends a short HANDOFF block to the session log after an order closes, so the next order can start fresh. | Avoids carrying one order's context into the next |
| `/elisys-lean:usage-report` | Asks Claude to run `elisys-usage` and name the biggest driver. You invoke it; Claude never auto-loads it. | – |
| Launchers in `~/.bashrc` | `elisys-build` (Opus 5 with the 1M window, high), `elisys-docs` (Sonnet 5, medium), `elisys-deep` (Fable 5.1, high), each with a smaller auto-compact window. | Model and context size are the two largest levers |

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

## Caveat

`elisys-usage` reads Claude Code's local transcript files, whose format is internal and may change.
If it reports "Nothing parsed", use `/usage` inside Claude Code instead.
