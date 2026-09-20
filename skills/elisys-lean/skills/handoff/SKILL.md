---
name: handoff
description: Close a work order cheaply. After an order's close-out, append a short HANDOFF block to the session log so the next order can start in a fresh session instead of a long compacted one.
---

# Handoff between work orders

Run this after a work order's close-out, before the next order starts.

1. Collect state, counts only:
   - `git rev-parse --short main` and the same for the TrustInsight and mirror remote refs
   - `gh pr list --state open --json number,title,isDraft --limit 20`
   - `ls ~/elisys-inbox/_prompts/queue/`
2. Append one HANDOFF block, 40 lines at most, to the session log the queue protocol already writes under `~/elisys-inbox/_prompts/`. If the protocol names a different place, use that place. Do not invent a new file scheme.
   The block carries: the order number just closed and its outcome in one line; main's hash on all three refs; open PRs with HELD status; what the next order in `queue/` is; anything the next session must not redo; decisions waiting on George.
3. Never copy transcript content, secrets, keys or personal data into the block. Never state that a gate was run unless it was.
4. Then say, in one line: "Order NNN closed and handed off. A fresh session for the next order will cost far less than continuing this one."

The handoff never replaces the session gate. The next session still runs whatever gate CLAUDE.md requires.
