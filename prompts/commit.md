---
description: Commit staged changes with a clean conventional commit message
argument-hint: "[extra context]"
---
Commit the currently staged changes.

1. Run `git diff --cached --stat` and `git diff --cached` to understand exactly what is staged.
2. Write a commit message:
   - Conventional Commits format: `type: short imperative summary` (feat/fix/refactor/docs/test/chore)
   - Body (only if needed): what changed and why, wrapped at ~72 chars
   - Australian English spelling
   - NO Claude/AI/co-authored attribution lines
3. Commit with the message via a heredoc so quoting is safe.
4. Confirm with `git log -1 --stat`.

If nothing is staged, list changed files and ask what to stage instead of guessing.
$ARGUMENTS
