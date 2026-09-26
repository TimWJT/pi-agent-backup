# pi agent config (live backup)

This folder **is** the live pi config at `C:\Users\Tim\.pi\agent` AND the backup.
Editing any file here changes what pi actually uses. Push to back up.

## Design record

Read [`docs/HARNESS-DESIGN.md`](docs/HARNESS-DESIGN.md) before reviewing or changing
the harness. It records Tim's explicit workflow decisions, the reasons behind the
current configuration, known limitations and future ideas that are not yet approved.

## What's tracked

- `AGENTS.md` — global instructions
- `HANDOVER.md` — cross-project briefing
- `agents/` — scout, reviewer and worker (subagents)
- `extensions/` — notify, protected-paths, subagent tool
- `prompts/` — normal and fast workflows, low-token `/tokensave` tasks, review, decisions, commit and backup commands
- `skills/web-research` — fallback curl-based web fetching skill
- `settings.json` — model behaviour, shell configuration and Pi packages
- `docs/HARNESS-DESIGN.md` — rationale, intentional behaviour and review checklist
- `docs/plans/` — implementation plans written by the audit commands

**Not tracked (gitignored):** `auth.json`, `sessions/`, `bin/`, `models-store.json`, `trust.json`

## Restoring on a fresh Windows

1. Install Git → Node.js LTS → run `pi` once and log in (creates `%USERPROFILE%\.pi\agent`).
2. Restore tracked configuration into that existing folder. This preserves ignored local authentication files:
   ```bash
   cd "$HOME/.pi/agent"
   git init
   git remote add origin https://github.com/TimWJT/pi-agent-backup.git
   git fetch origin main
   git reset --hard origin/main
   git branch -M main
   git branch --set-upstream-to=origin/main main
   ```
3. Run `pi` again. Pi restores the packages from `settings.json`.

Do not run `git clean`; it could remove local files that are intentionally not backed up.

## Shared skill outside this backup

`markitdown` remains in `%USERPROFILE%\.agents\skills\markitdown`. It is shared with
other compatible harnesses and is not tracked by this repository.

## Daily habit

After changing prompts/skills/extensions/settings:

Use `/pisave`. It stages only known configuration paths, checks what is staged, then commits and pushes.
