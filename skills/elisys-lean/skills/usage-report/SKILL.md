---
name: usage-report
description: Report where Claude Code tokens went on this machine over recent days, per session and per model.
disable-model-invocation: true
---

# Usage report

Run `elisys-usage --days 7` (use the number of days in "$ARGUMENTS" if one was given) and reply in ten lines or fewer:

1. Total tokens and the split by model, and the plan-limit percentages the report shows, Fable's weekly window included.
2. The three heaviest sessions, with average context per request, compaction count and subagent count.
3. The single biggest driver you can see (large average context, many compactions, subagent fan-out, or one model doing work a cheaper one could do), and one concrete change to cut it.

Report counts only. Do not open or quote transcript files.
