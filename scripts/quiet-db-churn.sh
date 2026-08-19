#!/usr/bin/env sh
# quiet-db-churn.sh — stop the committed vector DB from dirtying `git status`.
#
# WHY THIS EXISTS
#   db/ is intentionally tracked: the deployed backend has no persistent volume,
#   so the pre-built Chroma index has to ship inside the repo. But Chroma
#   rewrites sqlite pages and the WAL on *every* run — even a read-only query —
#   so `git status` reports db/chroma.sqlite3 as modified after simply starting
#   the server. That buries real changes under a 31MB binary you never meant to
#   commit, and makes `git add -A` a live grenade.
#
#   .gitignore can't help (the file is tracked, and untracking it would break
#   deploys). --skip-worktree is the right tool: git keeps the committed copy in
#   the index and stops looking at the working-tree version.
#
#   It's an index flag, so it lives in .git/index and is NOT cloned. Run this
#   once per clone.
#
# USAGE
#   sh scripts/quiet-db-churn.sh          # silence local DB churn
#   sh scripts/quiet-db-churn.sh --undo   # re-expose it, to commit a re-ingest
#
# TO COMMIT A GENUINELY REBUILT INDEX (after running ingest.py):
#   sh scripts/quiet-db-churn.sh --undo
#   git add db/ && git commit -m "rebuild vector index"
#   sh scripts/quiet-db-churn.sh
#
# CAVEAT: while the flag is set, a `git pull` that carries a new chroma.sqlite3
# will refuse to overwrite your local copy. Run --undo, `git checkout -- db/`,
# pull, then re-apply.

set -e
cd "$(dirname "$0")/.."

TRACKED_DB="db/chroma.sqlite3"

if [ ! -e "$TRACKED_DB" ]; then
  echo "warning: $TRACKED_DB not found — run 'python ingest.py' to build it." >&2
  exit 1
fi

if [ "$1" = "--undo" ]; then
  git update-index --no-skip-worktree "$TRACKED_DB"
  echo "re-exposed $TRACKED_DB — local modifications are visible to git again."
else
  git update-index --skip-worktree "$TRACKED_DB"
  echo "silenced $TRACKED_DB — still tracked and still deployed, just no longer"
  echo "reported as modified when Chroma touches it at runtime."
fi

echo
echo "current index flags (S = skip-worktree):"
git ls-files -v "$TRACKED_DB"
