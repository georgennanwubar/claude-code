#!/usr/bin/env bash
# elisys-lean installer. Personal scope only: nothing is written into the Elisys repository.
#   bash install.sh            install or upgrade
#   bash install.sh --uninstall
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude/skills/elisys-lean"
BACKUPS="$HOME/.claude/elisys-lean-backups"
RC="$HOME/.bashrc"
BEGIN='# >>> elisys-lean launchers >>>'
END='# <<< elisys-lean launchers <<<'

remove_rc_block() {
  [ -f "$RC" ] || return 0
  if grep -qF "$BEGIN" "$RC"; then
    cp "$RC" "$BACKUPS/bashrc.$(date +%Y%m%d%H%M%S)"
    sed -i "/$BEGIN/,/$END/d" "$RC"
  fi
}

mkdir -p "$BACKUPS" "$HOME/.claude/skills"

if [ "${1:-}" = "--uninstall" ]; then
  [ -d "$DEST" ] && mv "$DEST" "$BACKUPS/elisys-lean.$(date +%Y%m%d%H%M%S)"
  remove_rc_block
  echo "elisys-lean removed. If settings.json still points its statusLine at elisys-lean, run /statusline remove in Claude Code."
  exit 0
fi

command -v node >/dev/null || { echo "node is not on PATH; install Node first."; exit 1; }

echo "Installing elisys-lean to $DEST"
# Backups live outside ~/.claude/skills so an old copy never loads as a second plugin.
[ -d "$DEST" ] && mv "$DEST" "$BACKUPS/elisys-lean.$(date +%Y%m%d%H%M%S)"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
chmod +x "$DEST/bin/"* "$DEST/scripts/"*.mjs "$DEST/install.sh"

node "$DEST/scripts/install-statusline.mjs"

remove_rc_block
cat >> "$RC" << 'RCEOF'
# >>> elisys-lean launchers >>>
# `elisys` reads the queue and picks the model and effort itself (docs->sonnet,
# build->opus, deep only when an order names it). `elisys build|docs|deep` overrides the pick. No
# --autocompact cap: compaction happens only at Claude Code's default, near the window's end.
# The three named launchers remain. Named subagents default to sonnet via CLAUDE_CODE_SUBAGENT_MODEL.
elisys() {
  local pick m e
  pick="$(node ~/.claude/skills/elisys-lean/bin/elisys-pick "$@")" || pick=""
  if [ -n "$pick" ]; then
    read -r m e <<< "$pick"
    cd ~/projects/elisys && CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model "$m" --effort "$e"
  else
    echo "elisys-pick failed; use elisys-build / elisys-docs / elisys-deep"
  fi
}
elisys-build() { cd ~/projects/elisys && CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model 'opus[1m]' --effort high "$@"; }
elisys-docs()  { cd ~/projects/elisys && CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model sonnet --effort medium "$@"; }
elisys-deep()  { cd ~/projects/elisys && CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model fable --effort high "$@"; }
alias elisys-usage='node ~/.claude/skills/elisys-lean/bin/elisys-usage'
# <<< elisys-lean launchers <<<
RCEOF
echo "  launchers: elisys (auto-pick), elisys-build, elisys-docs, elisys-deep, elisys-usage added to ~/.bashrc"

if command -v claude >/dev/null; then
  echo "Validating plugin:"
  claude plugin validate "$DEST" || echo "  validate reported a problem; paste the output to the architecture chat."
else
  echo "  claude CLI not found on PATH; skipped validation."
fi

cat << 'DONE'

Done. Next:
  source ~/.bashrc
  elisys-usage --days 7        # free: reads local transcripts, no tokens spent
  elisys                       # picks the model from the queue; then /queue
Inside Claude Code, /plugin should list elisys-lean@skills-dir as enabled.
DONE
