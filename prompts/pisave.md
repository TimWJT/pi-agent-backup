---
description: Back up live pi config to GitHub (commit + push ~/.pi/agent)
---
Save my pi config. Do exactly this:

1. Run `git -C "$HOME/.pi/agent" add -A` then `git -C "$HOME/.pi/agent" status --short`.
2. If nothing is staged, reply "Nothing new to back up." and stop.
3. Commit with a short conventional message summarising what actually changed (feat/fix/chore, Aussie spelling).
4. Run `git -C "$HOME/.pi/agent" push origin main`.
5. Reply with one line: pushed + commit hash, or the error verbatim if push failed (auth failure → tell me to run the push myself in a terminal so the browser login can pop up).

Never touch auth.json, sessions/, bin/, models-store.json or trust.json — they are gitignored; leave them alone.
$ARGUMENTS
