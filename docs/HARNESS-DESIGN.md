# Pi harness design and decision record

**Created:** 2026-09-21 17:30:41 +10:00  
**Status:** Active living record  
**Scope:** Global Pi configuration in `C:\Users\Tim\.pi\agent`

## Purpose

This document explains why the harness is configured this way. It is for Tim and
future reviewers. It records intentional behaviour, known limitations and changes
that should not be reversed as accidental without checking with Tim.

This repository is both the live Pi configuration and its Git backup. Editing it
changes future Pi sessions after reload or restart.

## Tim's explicit decisions

These are user decisions, not agent assumptions.

1. **Normal paid-model workflow:** use `/audit-plan` followed by `/implement`.
   This workflow should minimise unnecessary model calls and token use.
2. **Free-model speed workflow:** keep `/audit-plan-fast` and `/implement-fast`.
   These commands deliberately maximise elapsed-time speed through broad parallel
   work. Token use is not a concern when Tim chooses them.
3. **No default model:** Union Alpha and Ox Alpha are retired and should not remain
   configured. Do not choose a replacement provider or model without Tim's decision.
4. **Thinking level:** keep the global default at `max`.
5. **Accordion:** keep it installed and allow it to update.
6. **Notifications:** notify on `agent_end` deliberately. An early notification is
   preferred even though retries, compaction or queued work can produce an early or
   repeated notification.
7. **Protected repositories:** `repos` protection is specific to the exact COMP3888
   shared repository tree. It must not apply globally to every folder called `repos`.
8. **`node_modules`:** do not globally block it through the protected-path extension.
9. **Verification:** use relevant checks where practical, but state their limits.
   Do not pretend a check proves behaviour that it does not exercise.
10. **Prompt cleanup:** remove `/godot-verify`, `/explain`, `/scout-and-plan`,
    `/implement-and-review` and the `/handover` command because Tim does not use them.
    Keep the existing `HANDOVER.md` document unless Tim separately asks to remove it.
11. **Shared skill cleanup:** remove all shared `~/.agents/skills` entries except
    `markitdown`. Tim does not use the bundled Codex/Cursor skills, Caveman or Loop.
12. **Token-saving task command:** keep `/tokensave` as an explicit prompt template
    for completing a supplied task with minimal status, delegation and response
    tokens. It must preserve technical substance, safety and verification. Compact
    means removing chatter and repetition, not simplifying or dumbing down content.
13. **Plan location:** new plans are written to a dedicated `docs/plans/` folder,
    created on demand. The design record itself stays directly in `docs/`.

## Workflow design

### Normal workflow

Use:

```text
/audit-plan <specific scope>
```

The audit works directly by default. It may use one well-scoped scout when broad
code discovery would materially reduce context noise. It does not launch parallel
workers unless Tim explicitly asks to trade extra tokens for speed.

The audit writes one implementation-ready plan, normally under `docs/plans/`, and
returns its exact path. After any open design decisions are answered, use:

```text
/implement "docs/plans/example-plan.md"
```

Normal implementation reads the supplied plan, confirms important assumptions
against current code, works directly by default, and uses at most one worker unless
Tim explicitly requests parallelism. It records the outcome in the plan.

### Maximum-speed workflow

Use only when token cost does not matter:

```text
/audit-plan-fast <specific scope>
/implement-fast "docs/plans/example-plan.md"
```

The fast prompts may dispatch up to 12 genuinely useful independent workers at once.
That limit is a ceiling, not a requirement to invent tiny tasks. These commands are
intentionally optimised for elapsed time rather than total model usage.

### Focused review

`/review` is useful for a current diff or a risky area. A separate review is most
valuable for saved data, security, authentication, payments, destructive operations
or large refactors. It is not required after every small implementation.

## Model and package configuration

`settings.json` intentionally has:

- no `defaultProvider`
- no `defaultModel`
- no fixed `enabledModels` list
- `defaultThinkingLevel` set to `max`

A model can be selected for a session with `/model`. Pressing `Ctrl+S` in the model
picker will create a new saved default and therefore changes this decision.

Installed packages:

- `@a-fig/accordion` is unpinned so it is eligible for updates. Accordion folds old
  context and allows agents to recover it through `recall` or `unfold`.
- `pi-live-models` remains pinned at `0.3.4`. Its generated `live-models*.json` files
  are local cache/catalogue files and are ignored by Git.

Unpinned packages are eligible to update through `pi update --extensions` or
`pi update --all`; this does not mean every Pi launch silently upgrades them.
Third-party Pi packages execute with the user's permissions. Review significant
updates if their trust or ownership changes.

## Subagent and token policy

`AGENTS.md` tells normal agents to use subagents selectively:

- direct work for focused tasks
- one scoped subagent for broad discovery when useful
- 2–4 parallel workers only for genuinely independent work
- larger batches only when speed explicitly matters more than token cost

The fast prompts explicitly establish that speed-first condition, so they can use
wide batches without conflicting with the global policy.

Each subagent is a separate model process with its own context. Parallel work can
reduce waiting time, but total usage usually grows roughly with worker count.

## Verification policy

Workers should run the most relevant targeted check when practical. They must say
what was actually checked and what remains unverified.

Examples:

- For Markdown, read the saved file.
- For JSON, parse it.
- For TypeScript, load or type-check it and run relevant tests.
- For game behaviour, automated checks may prove syntax or logic while an editor or
  play test is still needed for visual and interaction behaviour.

Passing one check is not proof that an entire feature is correct. Verification is
used to catch concrete mistakes and provide evidence, not to create false certainty.

## Notification design

`extensions/notify.ts` listens to `agent_end`, not `agent_settled`.

This is intentional. It gives Tim an earlier notification when an agent run ends.
A retry, automatic compaction or queued continuation can still follow, so an early or
repeated notification is an accepted trade-off.

Safety improvements remain:

- terminal escape notifications run only in interactive TUI mode on a real terminal
- PowerShell notification failures are handled and cannot crash Pi
- PowerShell and terminal-protocol values are escaped

## Protected-path design

`extensions/protected-paths.ts` treats this exact tree as protected:

```text
C:\Users\Tim\Documents\University of Sydney\Comp3888\repos
```

It covers direct `write` and `edit` calls and obvious modifying Bash/PowerShell
commands involving that tree. Paths are normalised for Windows separators and case.

It also blocks direct writes involving `.env`, `.env.*` and `.git` path components.
This part is global. `node_modules` and unrelated folders named `repos` are not
globally protected.

Known limits:

- This is defence in depth, not a security sandbox.
- A custom program or indirect script may evade shell-text detection.
- The exact COMP3888 path must be updated if the folder moves.
- The extension currently has no one-shot approval command for an intentional write.
- Operating-system permissions or a sandbox are required for a hard write boundary.

## Backup safety

`/pisave` deliberately avoids `git add -A`.

It:

1. refuses to mix pre-existing staged work into a new backup
2. checks only known configuration paths
3. stages only those paths
4. reviews staged names, size and content before committing
5. excludes authentication, sessions, generated model catalogues and other local data

The generated `live-models*.json` files are ignored. Authentication and trust files,
sessions, local binaries and model-store data remain ignored and must never be
printed or committed.

## Fresh restoration design

A normal `git clone` into `~/.pi/agent` fails after Pi has already created that
non-empty directory. The documented restoration instead initialises Git in the
existing folder, fetches the backup and resets tracked configuration to `origin/main`.
Ignored local authentication files remain in place.

`git reset --hard origin/main` overwrites tracked configuration. It is for a fresh
restore, not routine updating. Do not use `git clean`, because it may delete local
files that are intentionally absent from the backup.

## Efficiency assessment

The setup is currently good for its intended split:

- normal commands avoid unnecessary subagents
- fast commands preserve maximum parallel speed for future free models
- prompt templates make the audit-to-plan-to-implementation hand-off repeatable
- Accordion helps long sessions retain recoverable history
- generated catalogues no longer pollute Git
- verification is evidence-based rather than absolute

The main deliberate cost is `defaultThinkingLevel: max`. Tim has chosen quality over
lower reasoning-token use here.

Only `markitdown` remains under the automatically discovered shared
`~/.agents/skills` directory. This reduces skill-description context and avoids
irrelevant Codex/Cursor workflows activating inside Pi.

`/tokensave` is implemented as a short prompt template rather than an Agent Skill.
It is one-shot and task-oriented: work directly, avoid unnecessary subagents and
status commentary, then provide one compact but technically complete report. Pi may
still display tool calls in the interface; the command reduces model-generated text,
not tool visibility or internal reasoning tokens.

## Resource cleanup record

**Applied:** 2026-09-21 18:17:23 +10:00

Removed unused Pi prompt templates:

- `godot-verify.md`
- `explain.md`
- `scout-and-plan.md`
- `implement-and-review.md`
- `handover.md`

Removed shared skills:

- `automate`, `autopilot`, `canvas`, `caveman`, `create-hook`, `create-rule`
- `create-skill`, `create-subagent`, `deploy-with-vercel`, `goal`, `loop`
- `migrate-to-skills`, `new-repo`, `origin`, `rename-chat`, `review`
- `review-bugbot`, `review-security`, `sdk`, `share`, `shell`, `split-to-prs`
- `statusline`, `update-cli-config`, `update-cursor-settings`

Kept shared skill:

- `markitdown` — converts PDF, Word, PowerPoint, Excel, HTML and related files to
  Markdown using the local MarkItDown CLI

The removed shared skills were created as a batch on 2026-09-05 and were written for
Codex/Cursor workflows. The exact installer is not recorded, so provenance remains
unconfirmed. Their files were outside this Git repository. No existing Pi
`/i-have-adhd` resource was found during cleanup. A short prompt briefly used that
name, then was renamed `/tokensave` after Tim clarified that its purpose is token
saving rather than ADHD-friendly output. The upstream ADHD skill remains separate in
Claude.

## Efficiency cleanup record

**Applied:** 2026-09-27 01:05:16 +10:00

- Removed the almost-unused `planner` subagent. The audit prompts already create the
  implementation plan directly, so a second planning pass duplicated work.
- Kept `scout`, `reviewer` and `worker` as the distinct discovery, review and
  implementation roles.
- Marked `web-research` as a curl-only fallback. `ketch` remains the primary live
  research skill, avoiding ambiguous automatic routing between two research skills.
- Added a global rule to batch independent remote reads in one model response while
  keeping edits and dependent operations sequential.

The Shell Crackers project also preloads its five everyday Roblox MCP tools and asks
Pi to issue independent read-only calls together. This removes repeated tool-search
turns without running edits or Studio state changes concurrently.

Subagent dispatch now resolves model and thinking settings in this order: an explicit
coordinator override for that task, the agent file's default, then the coordinator's
current setting. Scout defaults to medium thinking, reviewer to high, and worker
inherits both settings. No faster scout model is fixed yet because Tim has not chosen
which model to use; the coordinator can still provide a one-task model override.

## Crash protection record

**Applied:** 2026-09-27 05:14:54 +10:00

Tim approved targeted crash prevention without reducing models, thinking levels,
skills or useful parallel coding. Windows recorded individual Node processes using
roughly 46–48 GB; attribution to a particular Pi/Paseo process is still unconfirmed.
The Personal Website physics-hero test already used a simulated clock and bounded
frames when inspected; it passed under the guarded runner. No website files changed.

- `extensions/subagent/runtime.ts` and `index.ts` now bound retained output, validate
  event input, handle callback failures, report failed tasks correctly, and clean up
  cancellation/shutdown. Windows cancellation targets the owned process tree.
- New subagent children receive a default 4096 MiB Node heap budget, preserving lower
  explicit limits and unrelated options. This is NOT a total-memory limit. Models,
  thinking defaults and the 12-worker ceiling are unchanged.
- Full final text is separate from display previews and chain hand-offs. Diagnostic
  capture is capped at 8 MiB per run without stopping normal execution. Artefacts
  live in gitignored `extensions/subagent/.artefacts/`; completed dead-owner runs
  expire by age/storage pressure. Live owners pin results, so total disk use is not
  a hard global cap. Oversized assistant records are explicitly reported incomplete.
- `extensions/subagent/guard-run.mjs` provides Windows-only command protection:
  `node <runner> --timeout-seconds 120 --memory-mb 2048 -- node <script> [args]`.
  An independent watchdog monitors private memory of the launched command and
  discovered descendants, with PID/creation-time checks. Timeout, memory excess
  and monitoring failure are failed checks. It never kills all Node processes.
- `AGENTS.md` and `/implement-fast` require guarded new/modified Node checks and
  one heavy build/test at a time per coordinator, while preserving parallel coding.
  This is an instruction-based policy, not automatic interception of every command.
  Separate Paseo sessions still require coordination. Polling can miss short-lived
  ancestry or overshoot; it is not a hard operating-system memory boundary.
- Existing running coordinators are not retroactively protected. Reload/restart Pi
  when idle to load the extension changes; no sessions were restarted by this work.
- Accordion's reported connection-cleanup risks remain unpatched: installed package
  edits would be overwritten by updates, and they are not a proven crash cause.

Verification: final combined offline suite ran through the guarded runner and passed
23 tests with one real POSIX test skipped on Windows, including PID-reuse regressions.
The website `scripts/easter-physicshero-test.mjs` passed through the 2048 MiB/120s
runner. Extension-loader checks and scoped `git diff --check` passed. No model calls
were used by fixtures, no global environment settings changed, and nothing committed.

## Possible future improvements — not approved yet

These are review candidates only. Do not implement them merely because they appear
here.

1. **Decide the `pi-live-models` update policy.** It is currently pinned for
   repeatability. Unpinning it would make extension improvements easier to receive,
   but increases update risk.
2. **Add focused extension tests.** Small tests for protected-path matching and
   notification event choice would make future refactors safer.
3. **Consider a controlled protected-path override.** A one-shot, exact-path approval
   could support intentional COMP3888 work. It must fail closed outside interactive
   mode and should not be added without Tim defining the desired approval flow.

## Future review checklist

Before changing this harness:

1. Read this document, `AGENTS.md`, `settings.json` and the specific prompt or
   extension being changed.
2. Check Git status and preserve pre-existing work.
3. Separate Tim's explicit decisions from recommendations.
4. Do not turn the normal workflow into a parallel token-heavy workflow.
5. Do not make the fast workflow cost-conscious; its purpose is maximum speed.
6. Do not choose a default model without Tim's approval.
7. Do not broaden COMP3888 `repos` protection to unrelated projects.
8. State what checks were run and what they do not prove.
9. Update this record when an intentional harness decision changes.

## Provenance and working-tree note

This record documents the harness review and Tim's corrections in the conversation
that ended on 2026-09-21. At the time it was created, the configuration repository
contained uncommitted work. In particular, `extensions/subagent/index.ts` already had
separate uncommitted changes and is not attributed to this design record. Review the
actual Git diff before committing; this document is rationale, not a substitute for
the diff.

## Fast workflow prompts record

**Applied:** 2026-09-27 03:41:55 +10:00

Implemented the plan at `docs/plans/fast-prompts-plan.md`, which audited `/audit-plan-fast` and
`/implement-fast`. Seven prompt and documentation changes, no code changes:

- `/audit-plan-fast` now always ends its response with one copyable fenced text block holding
  `/implement-fast` and the real plan path, on the first run as well as on later replies.
- Findings and implementation tasks are now ranked in bands: must fix, then best value, then
  least effort. Every task carries its finding's band, and a prerequisite overrides rank.
- `/implement-fast` gained a step, placed after the checks, that brings documentation back in
  line with the code. It is scoped tightly: it may update this record or a tracked-path list in
  `README.md` or `HANDOVER.md` only where the run made them wrong, and it may not create new
  documents or log files. The coordinator owns the plan document and the `docs/` records, so
  no worker writes the same file as the coordinator.
- A plan document now has one fixed tail layout: plan body, `## Your decisions` with its
  `### Answered decisions` subsection, `## Decision records`, `## Implementation record`. Appended
  records can no longer land inside a `#### Option A` block.
- Tim's decision 13 above: plans live in a dedicated `docs/plans/` folder, created on demand.
  `/pisave`, `.gitignore` and the protected-path extension needed no change and were not
  touched.
- Tim's decision that the saved plan keeps its full decision explanations, while the chat and
  `/implement-fast` and `/decisions` use one short four-block form: Question, What happens now,
  Options, Recommendation. The three commands no longer disagree about a question's shape.

The next real `/audit-plan-fast` run is the first test of these rules; the plan's Implementation
record lists what to check. All of these changes are uncommitted working-tree edits.
