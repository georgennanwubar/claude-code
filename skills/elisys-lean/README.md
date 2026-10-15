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
| Status line | `Opus·high │ ctx 312k/1M ██░░ │ 5h 22% │ 7d·other 64% │ 7d·fable 35%(2h) │ cache warm`. Both weekly gauges of a Max account: the live one for this session's model family, and the last-seen one for the other family with its age. Context turns yellow at 250k and red at 400k. In an `elisys-api` session it also shows the running cost against the budget, `API $3.46/$20`. | Lets you see a bloated session before it eats the week |
| `elisys-usage` | Reads local transcripts and prints plan-limit percentages (from the status line's snapshot), per-model usage since the weekly reset (Sunday 01:00 WAT), tokens per session and per model, average context per request, compactions and subagents. Counts only. Since v1.1.4 it also reads the `elisys-api` profile and prints it as its own section (tokens, no dollars). | Free: runs in your shell, not in Claude |
| `/elisys-lean:handoff` | Appends a short HANDOFF block to the session log after an order closes, so the next order can start fresh. | Avoids carrying one order's context into the next |
| `/elisys-lean:usage-report` | Asks Claude to run `elisys-usage` and name the biggest driver. You invoke it; Claude never auto-loads it. | – |
| Launchers in `~/.bashrc` | `elisys` is the everyday dispatcher: Sonnet 1M (`sonnet[1m]`) at high effort, `ELISYS_LAUNCH=dispatch`, no queue read. `elisys-build` (Opus 1M, high), `elisys-docs` (Sonnet, medium) and `elisys-deep` (Fable, high) are manual overrides and set `ELISYS_LAUNCH` to build, docs or deep. `elisys-api` (v1.1.4) is the overflow launcher: Sonnet at high effort on a pay-per-token API key, `ELISYS_LAUNCH=api`, in a separate Claude Code profile (`~/.claude-api`); see the section below. Every launcher sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, so a subagent George names runs cheap unless its own definition says otherwise. | Model choice is George's, made at the launch |

## elisys-api: the overflow launcher (v1.1.4)

`elisys-api` runs Claude Code on a pay-per-token Anthropic API key instead of the Max plan: `sonnet` at
high effort, `ELISYS_LAUNCH=api`, `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, in `~/projects/elisys`.

- **Separate profile.** It sets `CLAUDE_CONFIG_DIR=~/.claude-api`, so its sign-in and settings are its own
  and the other launchers never touch the key. `bin/elisys-api-profile` (run by the installer and again at
  every `elisys-api` start) prepares it. It never links or copies a credential. Symlinked from `~/.claude`:
  `skills/` (so this plugin and its hooks load), `CLAUDE.md`, `agents/` and `commands/` if they exist, and
  the Elisys project's `memory/` folder, so the same memory and rules apply. Copied afresh each start:
  `settings.json`, `settings.local.json`, `keybindings.json`. (Copied, not linked, because Claude Code
  writes `settings.json` itself; edit `~/.claude/settings.json` and the next start picks it up.)
  Everything else stays separate, transcripts included, which is how `elisys-usage` tells the two apart.
- **The key.** Read at launch from `~/.config/elisys/anthropic-api.env`, one line `ANTHROPIC_API_KEY=...`.
  The launcher refuses to start if the file is missing, is a symlink, is not a regular file, is not
  yours, or has any group or other permission bit (`chmod 600`). The key exists only in the launched
  `claude` process's environment: not in your shell, not on a command line, never printed, and no error
  message contains it. The installer never creates the file.
- **Budget.** Claude Code's `--max-budget-usd` works only with `--print` (checked on 2.1.296). The launcher
  passes it from `ELISYS_API_BUDGET_USD` (default 20) when you start with `-p`; interactively there is
  no hard stop, so the status line shows `API $cost/$budget` (yellow from 80%, red at the budget). Set a
  spend limit on the key's workspace in the Anthropic Console for a real cap.

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

- **1.1.5 (15 Oct 2026, ELISYS-713).** Every launcher (`elisys`, `elisys-build`, `elisys-docs`, `elisys-deep`, `elisys-api`) starts Claude Code inside a named tmux session when it is not already inside tmux. The session is `elisys-${ELISYS_LANE:-1}`, so lane 1 is `elisys-1` and `ELISYS_LANE=2` is `elisys-2`; `tmux new-session -A` reattaches to a running session instead of starting a second Claude. Already inside tmux, a launcher starts directly; `ELISYS_NO_TMUX=1` skips tmux; if tmux is not installed the launcher says so, prints `sudo apt install tmux` and starts without it. The model, effort and `ELISYS_LAUNCH` each launcher sets are unchanged. The command runs in an interactive bash inside the pane, so `~/.bashrc` loads there and `elisys-api` reads its key inside the pane and never puts it in an argument; a non-zero exit waits for Enter so an error is not lost when the pane closes. A pane started by an already-running tmux server does not inherit the launching shell's variables, so every exported `ELISYS_*` setting (`ELISYS_LANE`, `ELISYS_API_KEYFILE`, `ELISYS_API_BUDGET_USD`) is passed explicitly with `tmux -e`; a reattach keeps the settings the session started with. Detach with Ctrl-b d, list with `tmux ls`, run the launcher again to reattach. Needs tmux 3.2 or later for `-e` (3.4 is installed). The version is 1.1.5 because 1.1.4 (`elisys-api`) was already installed; the order that asked for this named v1.1.3.

- **1.1.4 (11 Oct 2026).** `elisys-api`: Sonnet at high effort on an API key, in the separate profile `~/.claude-api` (`CLAUDE_CONFIG_DIR`), `ELISYS_LAUNCH=api`. The key is read at launch from `~/.config/elisys/anthropic-api.env`; the launcher refuses a missing, symlinked, foreign-owned or group/other-readable file and never prints the key. New `bin/elisys-api-profile` builds the profile (shared skills, `CLAUDE.md` and project memory by symlink; settings copied fresh each start; no credential ever linked or copied). The status line shows running cost against `ELISYS_API_BUDGET_USD` (default 20) for `ELISYS_LAUNCH=api`, because Claude Code's budget flag is print-only. `elisys-usage` reads both profiles and prints the API one as its own section. `install.sh` writes the same block and prepares the profile without needing the key.

- **1.1.3 (11 Oct 2026).** `elisys` becomes a dispatcher: it always launches `sonnet[1m]` at high effort with `ELISYS_LAUNCH=dispatch` and no longer reads the queue to choose a model. `bin/elisys-pick` is reduced to that one fixed answer (same `MODEL EFFORT` stdout contract) and kept in place. `elisys-build`, `elisys-docs` and `elisys-deep` stay as manual overrides and now set `ELISYS_LAUNCH` to build, docs or deep. `install.sh` writes the same block.

- **1.1.2 (21 Sep 2026).** Both weekly gauges on the status line. Measured on George's account:
  Claude Code's status feed carries one `seven_day` window, scoped to the model family the
  session runs on (a Fable session reports Fable's weekly; Opus/Sonnet sessions report the
  other). The status line now keeps a snapshot per family (`rate-limits-fable.json`,
  `rate-limits-other.json`) and shows the live gauge plus the other family's last-seen gauge
  with its age. `elisys-usage` prints both under Plan limits with reset times in WAT.
  `ELISYS_LEAN_SCOPED_7D=0` turns the split off if `/usage` ever shows the feed is not
  model-scoped.

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
