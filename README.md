# pi agent config (live backup)

This folder **is** the live pi config at `C:\Users\Tim\.pi\agent` AND the backup.
Editing any file here changes what pi actually uses. Push to back up.

## What's tracked

- `AGENTS.md` — global instructions
- `HANDOVER.md` — cross-project briefing
- `agents/` — scout, planner, reviewer, worker (subagents)
- `extensions/` — notify, protected-paths, subagent tool
- `prompts/` — /commit /explain /godot-verify /handover etc.
- `skills/web-research` — curl-based web fetching skill
- `settings.json` — ox-alpha via OpenRouter, thinking high

**Not tracked (gitignored):** `auth.json`, `sessions/`, `bin/`, `models-store.json`, `trust.json`

## Restoring on a fresh Windows

1. Install Git → Node.js LTS → run `pi` once and log in (creates `%USERPROFILE%\.pi`)
2. Then:
   ```bash
   git clone https://github.com/TimWJT/pi-agent-backup.git "$HOME/.pi/agent"
   ```
3. Restart pi. Done.

## The shared caveman skill (separate!)

`caveman` lives in `%USERPROFILE%\.agents\skills\caveman` because Hermes shares it.
It's NOT in this repo — copy that folder somewhere safe manually if you change it,
or restore it by hand after a reinstall.

## Daily habit

After changing prompts/skills/extensions/settings:

```bash
cd ~/.pi/agent && git add -A && git commit -m "update" && git push
```
