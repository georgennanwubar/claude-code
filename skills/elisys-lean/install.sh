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
  echo "elisys-lean removed. ~/.claude-api and ~/.config/elisys/anthropic-api.env are left in place; delete them yourself if you want them gone. If settings.json still points its statusLine at elisys-lean, run /statusline remove in Claude Code."
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
# `elisys` is the everyday launcher: a dispatcher session on Sonnet 1M at high effort
# (ELISYS_LAUNCH=dispatch). It no longer reads the queue to choose a model. The next three are
# manual overrides: elisys-build (Opus 1M, high), elisys-docs (Sonnet, medium) and elisys-deep
# (Fable, high; pinned to claude-fable-5-1 by ANTHROPIC_DEFAULT_FABLE_MODEL in settings.json).
# Each sets ELISYS_LAUNCH to build, docs or deep. No --autocompact cap: compaction happens only at
# Claude Code's default, near the window's end. Named subagents default to sonnet via
# CLAUDE_CODE_SUBAGENT_MODEL.
# `elisys-api` is the overflow launcher: Sonnet at high effort on a pay-per-token API key
# (ELISYS_LAUNCH=api), in its own Claude Code profile, ~/.claude-api, so its sign-in and settings
# are separate and the four launchers above never see the key. The key is read at launch from
# ~/.config/elisys/anthropic-api.env (ANTHROPIC_API_KEY=..., owned by you, no group or other
# permission bits). It exists only in the launched claude process's environment: never in this
# shell, never in an argument, never printed. ELISYS_API_BUDGET_USD (default 20) is the session
# budget the status line measures cost against; Claude Code enforces a budget flag only with -p.
elisys()       { cd ~/projects/elisys && ELISYS_LAUNCH=dispatch CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model 'sonnet[1m]' --effort high "$@"; }
elisys-build() { cd ~/projects/elisys && ELISYS_LAUNCH=build CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model 'opus[1m]' --effort high "$@"; }
elisys-docs()  { cd ~/projects/elisys && ELISYS_LAUNCH=docs CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model sonnet --effort medium "$@"; }
elisys-deep()  { cd ~/projects/elisys && ELISYS_LAUNCH=deep CLAUDE_CODE_SUBAGENT_MODEL=sonnet claude --model fable --effort high "$@"; }
elisys-api() (
  set +x
  fail() { printf 'elisys-api: %s\n' "$*" >&2; exit 1; }
  keyfile="${ELISYS_API_KEYFILE:-$HOME/.config/elisys/anthropic-api.env}"
  [ -L "$keyfile" ] && fail "$keyfile is a symlink; save the key in that file itself, not a link."
  [ -e "$keyfile" ] || fail "no key file at $keyfile. Create it with one line, ANTHROPIC_API_KEY=<your key>, then run: chmod 600 $keyfile"
  [ -f "$keyfile" ] || fail "$keyfile is not a regular file."
  [ -O "$keyfile" ] || fail "$keyfile is not owned by you; recreate it as your own user."
  mode=$(stat -c %a -- "$keyfile") || fail "cannot read the permissions of $keyfile."
  [ $((8#$mode & 077)) -eq 0 ] || fail "$keyfile has mode $mode, readable by other users. Run: chmod 600 $keyfile"
  [ -r "$keyfile" ] || fail "$keyfile is not readable by you; run: chmod 600 $keyfile"
  budget="${ELISYS_API_BUDGET_USD:-20}"
  case "$budget" in ''|*[!0-9.]*|*.*.*|.) fail "ELISYS_API_BUDGET_USD must be a plain number such as 20 or 7.5." ;; esac
  command -v claude >/dev/null || fail "claude is not on PATH."
  helper="$HOME/.claude/skills/elisys-lean/bin/elisys-api-profile"
  [ -x "$helper" ] || fail "$helper is missing; reinstall elisys-lean (bash install.sh)."
  "$helper" || fail "the ~/.claude-api profile could not be prepared."
  key=
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case "$line" in ANTHROPIC_API_KEY=*|"export ANTHROPIC_API_KEY="*) key=${line#*ANTHROPIC_API_KEY=} ;; esac
  done < "$keyfile"
  key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
  key=${key#[\"\']}; key=${key%[\"\']}
  [ -n "$key" ] || fail "$keyfile has no ANTHROPIC_API_KEY=<key> line, or its value is empty."
  case "$key" in *[[:space:]]*|*[[:cntrl:]]*) fail "the ANTHROPIC_API_KEY value in $keyfile contains spaces or control characters." ;; esac
  unset line ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN
  cap=()
  for a in "$@"; do case "$a" in -p|--print) cap=(--max-budget-usd "$budget") ;; esac; done
  export ANTHROPIC_API_KEY="$key" CLAUDE_CONFIG_DIR="$HOME/.claude-api" ELISYS_LAUNCH=api ELISYS_API_BUDGET_USD="$budget" CLAUDE_CODE_SUBAGENT_MODEL=sonnet
  unset key keyfile mode helper a budget
  cd ~/projects/elisys || fail "cannot enter ~/projects/elisys."
  exec claude --model sonnet --effort high "${cap[@]}" "$@"
)
alias elisys-usage='node ~/.claude/skills/elisys-lean/bin/elisys-usage'
# <<< elisys-lean launchers <<<
RCEOF
echo "  launchers: elisys (dispatcher, Sonnet 1M high), elisys-build, elisys-docs, elisys-deep, elisys-api (Sonnet high on an API key), elisys-usage added to ~/.bashrc"

# The elisys-api profile. Needs no key: the key file is created by you, never by this installer, and
# no credential or sign-in file is ever linked or copied (see bin/elisys-api-profile).
echo "Preparing the elisys-api profile (~/.claude-api):"
"$DEST/bin/elisys-api-profile" -v || echo "  profile not prepared; elisys-api will retry on its first launch."
[ -d "$HOME/.config/elisys" ] || mkdir -p -m 700 "$HOME/.config/elisys"

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
  elisys                       # dispatcher on Sonnet 1M, high effort; then /queue
  # elisys-api needs your key first: save ANTHROPIC_API_KEY=<key> in ~/.config/elisys/anthropic-api.env,
  # then chmod 600 that file. Then: elisys-api
Inside Claude Code, /plugin should list elisys-lean@skills-dir as enabled.
DONE
