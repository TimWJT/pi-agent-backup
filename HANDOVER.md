# Briefing for Pi — cross-project handover

> Read this at the start of any fresh session when Tim says "read your handover" or
> points you at this file. Each project also has its own auto-loading instruction file
> (AGENTS.md / CLAUDE.md) which is the authoritative source once inside that folder.

---

## Part 1 — Pi configuration (what's set up and why)

Tim uses **Pi for code-heavy work** and Hermes Agent for general use.

| Location | Config |
|---|---|
| Global (`~/.pi/agent/settings.json`) | openrouter / ox-alpha / thinking high / quietStartup / Git Bash shell |

**No per-project settings** — one global config covers everything; Tim does similar work
in each project so a single profile is enough (decided 26 Aug).

**Models:** ox-alpha via OpenRouter only (`enabledModels` = `stealth/ox-alpha`).
No Anthropic/Claude fallback — deliberate choice, don't add one.

**Backup = live folder:** `~/.pi/agent` IS a git repo, pushed to private GitHub
`TimWJT/pi-agent-backup`. Secrets/sessions are gitignored. After changing config:
`git add -A && git commit && git push` — or just use `/pisave`.
Git identity configured: TimWJT / tim200465@gmail.com.

Prompt templates in `~/.pi/agent/prompts/`: `/pisave`, `/commit`, `/explain`,
`/godot-verify`, `/handover` (updates this file), plus implement/review/scout-and-plan
workflow wrappers.

**Web research:** `ketch` CLI (v0.14.0) installed at `C:\Users\Tim\bin\ketch.exe`, on user
PATH (restart terminals to see it). Skill in `skills/ketch/`. Search backend = Brave free
tier — **key not yet added**; Tim must run `ketch config set brave_api_key <key>`
(sign up at brave.com/search/api). Until then only DDG/exa zero-config search works.
Fallback chain if Brave runs dry: Serper/Tavily free keys or DDG. Route big research jobs
through `scout` subagents so raw pages stay out of main context.
Old `skills/web-research` (curl-based) kept as a fallback.

**Caveman skill** (`%USERPROFILE%\.agents\skills\caveman`, shared with Hermes, NOT in the
backup repo): trimmed 26 Aug — wenyan levels removed, activation now explicit-only
("be brief" ≠ caveman mode), anything written to disk stays normal prose.

First interactive launch in a project folder with `.pi/` shows a one-time trust prompt —
answer yes. `-a` / `--approve` bypasses it for non-interactive runs.

---

## Part 2 — Project A: RELT platform

**Path:** `C:\Users\Tim\Documents\Coding\Web Development\RELT`
**Brain file:** `CLAUDE.md` (auto-loads) · **Specs:** `docs/` (11 markdown documents)
**Git:** own repo; doc corrections from 23 Aug were uncommitted as of 24 Aug.

### What it is

Web platform for **Refugee English Language Tutoring Ltd**, a Sydney not-for-profit that
pairs volunteer tutors with refugees/asylum seekers for free weekly English tutoring.
Replaces a bad Excel database (114/115-column Register, MS Forms, Power Automate).
**Excel coexistence is the core requirement**: import the Register, export a
Register-shaped file back. Build for non-technical volunteers.

### Status

Documentation phase complete, no code yet. Tech stack undecided (Tim + Hugo decide,
informed by specs). Build order: logins/permissions → import → export → pairing engine.

### Non-negotiable rules (respect these)

1. The platform **never writes to the Excel Register** — export only.
2. Import never overwrites silently and never deletes; every import is a reviewed change set.
3. **Safety rules are blocks, never points.** Conflict pairings, same-gender requirements
   and vetting status remove a candidate entirely — no score can outweigh them.
4. A human confirms every pairing; the engine proposes, never acts.
5. **No LLM in the scoring path.** Pairing must be deterministic and explainable.
6. Sensitive data (visa status, criminal disclosure, referees) — access control is a
   requirement, not a later feature.
7. Never develop against live participant data — use the 200-record simulated Register.
8. Never address Register columns by letter; detect by header text (two layouts circulate).

Also: the 115-column layout is an Excel artefact, **not** the target schema — design a
proper relational model. Don't carry over spreadsheet-shaped constraints. Terminology:
"student" not "tutee", "pairing" not "matching".

---

## Part 3 — Project B: COMP3888 PanSegAI (uni capstone)

**Path:** `C:\Users\Tim\Documents\University of Sydney\Comp3888`
**Brain file:** `CLAUDE.md` at that level · **Knowledge base:** `ai-notes/docs/`

### ⛔ Critical structural rule

```
Comp3888\
├── CLAUDE.md          ← project context (auto-loads)
├── ai-notes\          ← ALL AI-generated notes/docs belong here
├── admin\             ← slides, docs copies
└── repos\             ⛔ three clones of the REAL SHARED GRADED team repo
    ├── tim\           ← Tim's clone, branch tim/ct-baseline-scaling
    ├── main\          ← tracks origin/main
    └── bobbie\        ← teammate's clone
```

Seven teammates share github.sydney.edu.au/jwan0839/COMP3888_TU12_02. Default posture:
**repos/ is read-only**; notes/scaffolding goes to `ai-notes/`. Only on explicit request:
code on `repos/tim`, personal branch, push via pull requests — never commit clutter,
never touch other clones.

### What it is

P35 — deep-learning model segmenting the **pancreas** in CT/MRI scans. Team of 7,
Extreme Programming roles. 4 Aug – 6 Oct 2026. Deliverables: Progress Report W6 (10%),
Client Deployment W8, Final Delivery W12, Final Report + Demo W13 (50%).

### Technical state (24 Aug 2026)

- Reproducible scaled CT slice-based baseline on `tim/ct-baseline-scaling`: trainer,
  volume-level evaluator, largest-connected-component post-processing. Working tree clean.
- Local Dice ≈ 0.59 held-out vs SOTA ≈ 0.88 — expected for slice-based baseline;
  goal was working end-to-end pipeline by W5 demo.
- Training env: `D:\pansegai-work\.venv` (torch 2.8.0+cu128, RTX 4050 6GB);
  data/results under `D:\pansegai-work`. Deterministic CUDA needs
  `CUBLAS_WORKSPACE_CONFIG=:4096:8`. GPU memory is the binding constraint.
- Domain constants: pancreas ≈ 0.5% of abdominal voxels, hardest organ; PanSegNet
  (Zhang et al. 2024) is reference; TotalSegmentator (~0.75 Dice) is the floor; MRI data
  at osf.io/kysnj. Metrics discipline: patient-level splits, report HD95 alongside Dice,
  attach protocol to every number.

### Explanation style

Tim knows classical ML but is new to deep learning — build from fundamentals without
condescending. Primers: `ai-notes/docs/01-domain-primer.md`, `02-dl-primer.md`.

---

## Part 4 — Project C: Godot roguelike ("Actually This TIme Bullets")

**Path:** `C:\Users\Tim\Documents\Coding\Godot\Projects\Actually This TIme Bullets`
**Brain files:** `Roguelike/AGENTS.md` and `Roguelike/CLAUDE.md` (auto-load)

See those files for current rules — they are authoritative for game dev work.

---

## Part 5 — How Tim works (applies everywhere)

- **Plain simple English.** Define every technical term on first use; short sentences;
  everyday analogies.
- **Concrete worked examples with numbers**, not abstractions.
- Patient step-by-step walkthroughs; Australian English spelling.
- Prefers **modular, data-driven designs** — config fields over per-feature scripts.
- Dislikes forced naming conventions.

---

Last updated: 2026-08-26 (fresh-Windows restore complete; ketch installed, Brave key pending;
backup repo = live ~/.pi/agent)
