---
description: Back up live pi config to GitHub (commit + push ~/.pi/agent)
---
Save my pi config. Do exactly this:

1. Check for pre-existing staged work with `git -C "$HOME/.pi/agent" diff --cached --quiet`. If anything is already staged, stop and ask me to review or commit it first; never mix it into this backup automatically.
2. Run `git -C "$HOME/.pi/agent" status --short --untracked-files=all -- .gitignore AGENTS.md HANDOVER.md README.md settings.json agents docs extensions prompts skills`. Inspect every path before staging. If a path may contain a secret, generated catalogue, session data or unrelated personal file, stop with a warning.
3. Stage only those intended configuration paths with:
   `git -C "$HOME/.pi/agent" add -- .gitignore AGENTS.md HANDOVER.md README.md settings.json agents docs extensions prompts skills`
4. Inspect `git -C "$HOME/.pi/agent" diff --cached --name-status`, `git -C "$HOME/.pi/agent" diff --cached --stat`, and the staged changes themselves. Never reproduce a detected secret in chat. Unstage everything and stop if any path or content is unsafe or unrelated.
5. If `git -C "$HOME/.pi/agent" diff --cached --quiet` succeeds, reply "Nothing new to back up." and stop.
6. Commit with a short conventional message summarising what actually changed (feat/fix/chore, Aussie spelling).
7. Run `git -C "$HOME/.pi/agent" push origin main`.
8. Reply with one line: pushed + commit hash, or the error verbatim if push failed (auth failure → tell me to run the push myself in a terminal so the browser login can pop up).

Never open, print, stage or modify auth.json, sessions/, bin/, models-store.json, trust.json or generated live-models*.json files; leave them alone.
$ARGUMENTS
