# Fast workflow prompts — audit findings and implementation plan

**Created:** 2026-09-27 03:26:34 +10:00 (2026-09-26 17:26:34 UTC) — read from the system clock
**Plan status:** Ready for implementation, except the two tasks that depend on the open decisions below (T6 and T7)
**Implementation status:** Complete — T1 to T7 implemented and checked 2026-09-27; T8 and the optional extras were declined by Tim on 2026-09-27 and are closed, not pending. See the Decision records and Implementation record in this document.
**Inspected Git HEAD:** `cb4302b39308ec15c562230109bf07f9652de469` ("feat: install Accordion context-folding extension (npm:@a-fig/accordion)"), branch `main`, last commit 2026-08-26 06:54:25 +1000
**Uncommitted changes at audit time:** Yes — a large amount. The HEAD commit does **not** contain any of the files this plan changes. 20 tracked files are modified or deleted, nothing is staged, and 7 paths are untracked (never committed in any ref):

- Untracked: `agents/deep.md`, `docs/HARNESS-DESIGN.md`, `prompts/audit-plan-fast.md`, `prompts/audit-plan.md`, `prompts/decisions.md`, `prompts/implement-fast.md`, `prompts/tokensave.md`
- Modified: `.gitignore`, `AGENTS.md`, `HANDOVER.md`, `README.md`, `agents/reviewer.md`, `agents/scout.md`, `agents/worker.md`, `extensions/notify.ts`, `extensions/protected-paths.ts`, `extensions/subagent/agents.ts`, `extensions/subagent/index.ts`, `prompts/implement.md`, `prompts/pisave.md`, `settings.json`, `skills/web-research/SKILL.md`
- Deleted: `agents/planner.md`, `prompts/explain.md`, `prompts/godot-verify.md`, `prompts/handover.md`, `prompts/implement-and-review.md`, `prompts/scout-and-plan.md`

Both prompts under audit, and every file the tasks touch, are uncommitted working-tree content. Preserve all of it.

---

## Scope and goal

**Scope:** `prompts/audit-plan-fast.md` and `prompts/implement-fast.md`, plus the files that must stay consistent with them.

**Goal:** make three requested improvements to the fast workflow, and record two smaller weaknesses found while checking:

1. `/audit-plan-fast` must always finish with a copyable command to start implementation.
2. After an implementation run, the workflow must tidy up — update the documentation in `docs/` and keep plans somewhere sensible.
3. Suggestions must be ranked best-to-worst by the AI's own judgement, and the questions asking Tim for decisions must be a little less verbose.

**Not in scope:** changing behaviour, defaults, models, subagent limits, protected paths, notification design, or anything in `extensions/`. No code changes are needed — these are prompt and documentation files.

## Project state inspected

- `docs/` contains exactly one file, `docs/HARNESS-DESIGN.md`. No `*-plan.md` file exists anywhere in the repository, and no `docs/plans/` folder exists.
- `prompts/` holds 9 templates: `audit-plan.md`, `audit-plan-fast.md`, `commit.md`, `decisions.md`, `implement.md`, `implement-fast.md`, `pisave.md`, `review.md`, `tokensave.md`.
- `docs/HARNESS-DESIGN.md` is the harness's own design record. Its "Future review checklist" item 9 (line 317) says: "Update this record when an intentional harness decision changes." Its "Possible future improvements — not approved yet" section (line 290) lists candidates that must not be implemented without Tim's approval.
- The subagent extension's real limits match what the prompts claim: `MAX_PARALLEL_TASKS = 64` and `MAX_CONCURRENCY = 12` at `extensions/subagent/index.ts:33-35`, enforced at `:627-632` and `:670`. The `subagent` tool name and its `tasks` array, `agentScope` and `cwd` parameters exist as the prompts describe (`:461-493`, `:498`). **No false claims found in the prompts about the tooling.**
- `prompts/pisave.md:9` stages `docs` as a directory path, which Git treats as a recursive prefix. Nested files are already tracked that way (`git ls-files extensions` shows `extensions/subagent/index.ts` from a bare `extensions` pathspec). `.gitignore` has no rule touching `docs/`, confirmed with `git check-ignore -v docs/plans/x.md` returning "not ignored".
- `extensions/protected-paths.ts:18-19,35-41` protects only the exact COMP3888 `repos` tree and any path component named `.git`, `.env` or `.env.*`. Nothing under `~/.pi/agent/docs` is blocked.

## Findings, ranked best to worst

Ranking criterion, applied consistently: value to Tim × certainty of the evidence ÷ effort and risk. Items 4 and 5 are ranked by worth but are **paused** until Tim answers, because his answer changes what gets built.

### 1. `/audit-plan-fast` never gives a copyable command on the run that matters

**Evidence.** In the numbered steps, the only mention of the next command is inline, with a literal placeholder (`prompts/audit-plan-fast.md:193-195`):

> Then summarise the most important findings and decisions briefly, and give the exact next command:
> `/implement-fast <document-path>`

The rule that makes it copyable — a fenced text block, paths with spaces quoted, "Never leave a placeholder in that command" — exists only in the trailing "Answer follow-ups" paragraph (`:213-215`), which by its own opening words applies only "when the user replies to these questions". So the first response, the one that just wrote a new plan, has no copyable block and an unresolved `<document-path>` placeholder sitting in the instruction. Step 7 then says to end with the Your decisions section (`:197`), so the command is stranded mid-message with the decisions text after it.

**Observed vs intended.** Observed: the copyable block appears only on the second and later turns. Intended: it is the established house style — `prompts/decisions.md:68-69` and `prompts/implement-fast.md:165-166` both require "ONE copyable fenced text block". The follow-up paragraph is the refined version of the same contract; step 7 was never brought in line.

**Impact.** On the most important run of the command, the command to start implementation is bare inline text with a placeholder token that a model may copy through verbatim. Tim cannot paste from the end of the message.

**Confidence:** High. **Check status:** code inspection only, confirmed by a reviewer re-reading `:190-216` and grepping for `fenced|copyable|placeholder` across `prompts/*.md`.

### 2. Nothing ranks suggestions; the AI's order is unconstrained

**Evidence.** "Prioritised" appears at `prompts/audit-plan-fast.md:7` and `:94` only as a section label. There is no sort instruction, no criterion and no banding anywhere in the file — verified by searching for `rank|order|prioriti[sz]|best|worst|severity|must.?fix|P1|priority|sort|highest`. The only ordering rules that exist are about dependencies: "prerequisites first, then independent tasks" (`:99`) and verification "in dependency order" (`:102`).

`prompts/review.md:21` is the only file in the set with a mechanical scheme: "Rank findings: 🔴 must fix, 🟡 should fix, 🟢 nice to have." It is never referenced by the audit prompts. `prompts/audit-plan.md:29` has the same gap as the fast one, so this is shared, not a fast-only regression.

**Impact.** Two audits of the same code with the same findings can emit different orders, and the difference is invisible downstream because `prompts/implement-fast.md:38-39` ("Run prerequisites first") is the implementer's only dispatch-order rule and has no notion of value to fall back on. A run can therefore finish its most valuable work last, or not at all.

**Confidence:** High. **Check status:** inspection only, reviewer-confirmed with line-level quotes.

**Note for whoever writes the fix:** value-ordering and dependency-ordering can disagree. A high-value change may sit behind a boring prerequisite. The rule has to say both: prerequisites override rank, and among *ready* tasks the highest rank goes first. Adding the ranking line to the audit prompt alone would be insufficient and would push the guessing one stage downstream.

### 3. Nothing tidies up the documentation after an implementation run

**Evidence.** Neither fast prompt contains any instruction to update project documentation. A case-insensitive search for `HARNESS-DESIGN|README|HANDOVER|AGENTS\.md|CLAUDE\.md|documentation` in `prompts/implement-fast.md` and `prompts/audit-plan-fast.md` returns exactly one hit: `implement-fast.md:23`, "check PLAN.md, docs/ and handover notes", which is a *read* instruction for finding a plan. The prompts' entire write scope is the plan document itself (`implement-fast.md:80-82`, `audit-plan-fast.md:107-113`).

Meanwhile `docs/HARNESS-DESIGN.md:317` requires the record be updated when an intentional decision changes, and `README.md:21` lists `docs/HARNESS-DESIGN.md` as a single tracked file that a new subfolder would make incomplete.

**Observed vs intended.** A reviewer tested the obvious counter-hypothesis — that "Keep this document as the single record: no separate log files" (`audit-plan-fast.md:107`) forbids touching other documents — and **corrected** it: the sentence's contrast class is log files, so it is not misleading. The real failure is silence. A worker that follows the prompts exactly will never touch `docs/HARNESS-DESIGN.md`, not because it is forbidden but because it was never mentioned. Intentions in the design record will therefore silently go stale.

**Impact.** The design record drifts from actual behaviour, which is exactly the record future reviewers and the README point people to.

**Confidence:** High. **Check status:** inspection only, reviewer-confirmed including the protected-path and `/pisave` interaction checks.

### 4. The questions asking Tim for decisions are long, and the same question looks different in each command

**Evidence.** `prompts/audit-plan-fast.md:127-189` sets a "REQUIRED LAYOUT in both the saved plan and final chat". Per question it requires 4 fixed blocks (**What you are deciding**, **What happens now**, **My recommendation and why**, **What is still uncertain**) and, inside every option, 4 more bold labels (**What would happen**, **Example**, **Benefits**, **Downsides and consequences**) at `:152,154,157,158`. A three-option question is 4 + 12 = 16 labelled blocks, in chat as well as on disk.

`prompts/implement-fast.md:134-146` and `prompts/decisions.md:30-42` use a flat four-label shape for the same kind of question: **Question**, **What happens now**, **Options**, **Recommendation** — all option detail written as prose inside one `Options:` block.

So one open decision is presented in two incompatible shapes depending on which command raised it, and `audit-plan-fast.md:200-202` explicitly forbids the compression the short form performs ("Do not compress the options into bare lists"). No prompt says the difference is intentional.

Length that is added rather than earned, all reviewer-confirmed: `:131-132` adds a numbered title list that "does not replace the full explanations"; **What happens now** (`:141-146`) and **What is still uncertain** (`:168-170`) ask for the same unverified-facts content twice; `:155` places the cross-option instruction "Compare options using the same starting situation" inside a per-option label where one option cannot satisfy it; `:156`, `:162` and `:163` each repeat a "do not invent" caution; `:138-139` restates the `### Q1` heading inside **What you are deciding**; `:129-130` refers to "reply examples" that `:173` forbids; `:118-123`, `:176-180` and `:199-202` push hard against brevity ("Do not cut these explanations just to keep the final response short"). One internal contradiction: `:193` says summarise "briefly" while `:200-201` says "Carry over the complete decision explanations".

**Impact.** The chat, which Tim reads every time, is the most verbose surface; and the two shapes make a question harder to recognise across turns than it needs to be.

**Confidence:** High for the structural facts. **Check status:** inspection only; counts taken directly from the files. How much this costs in practice is unmeasured — see Q2.

**How much to cut is a judgement call for Tim, not something inspection can settle.** Handled as Q2.

### 5. Where plans live, and is a dedicated folder a good idea

**Evidence.** Two prompts hard-code the default save path: `prompts/audit-plan.md:26-27` and `prompts/audit-plan-fast.md:83-84`, with the example echoed at `audit-plan-fast.md:192`. Two prompts search for plans: `implement-fast.md:23` and `decisions.md:13-14` ("check PLAN.md, docs/ and handover notes"). The convention is described in `docs/HARNESS-DESIGN.md:61,65,78` and listed in `README.md:14-22`.

**What is already fine, so the implementer does not need to touch it:** backups need no change, because `/pisave` already stages `docs` recursively (`prompts/pisave.md:9`) and `.gitignore` ignores nothing under `docs/`. The protected-path extension does not block `~/.pi/agent/docs` (`extensions/protected-paths.ts:18-19,35-41`).

**Impact.** `docs/` currently holds the design record alone. As plans accumulate they will sit beside it with nothing marking them as work-in-progress rather than settled design.

**Confidence:** High for the mechanics. **Check status:** inspection only. Whether a dedicated folder is *wanted* is Tim's call — Q1.

### 6. Three prompts all append to "the end" of the same plan, with no defined order

**Evidence.** `audit-plan-fast.md:110` tells the implementer to "append a short dated Implementation record after the original plan"; `:113` puts the Your decisions section "At the END of the original plan"; `:186-187` sends later `/decisions` records to "the document's end"; `decisions.md:52` appends "at the end of the same source plan"; `implement-fast.md:99` appends "under Implementation record at the end of the document". No prompt defines the order, and none ever creates the `## Implementation record` heading that `implement-fast.md:99` inserts under — the string appears only at `audit-plan-fast.md:110`, `implement-fast.md:99` and `prompts/implement.md:29`, none of which creates a heading.

**Impact, in likelihood order:** a record written as `###` or a bold block lands under the last heading in the file, which in a plan is `#### Option A` inside a question, so the record renders as part of an answer. After the first `/decisions` append, `Your decisions` is no longer last, so Implementation records land *below* Decision records. Nothing in the prompts would detect either. `### Answered decisions` is created once at plan time (`audit-plan-fast.md:183-185`) and then bypassed by every later append.

**Confidence:** High. **Check status:** inspection only, reviewer-confirmed. This one is not a requested change, but it is cheap and it protects the record the whole workflow depends on.

### 7. Minor, unrequested observations (no task)

- The subagent tool supports a per-task `thinkingLevel` override (`extensions/subagent/index.ts:465,473,486`) that neither fast prompt uses. Not a defect; an unused capability. Do not implement without approval.
- `extensions/protected-paths.ts:47-53` blocks a bash command whose text contains the absolute COMP3888 `repos` path. `HANDOVER.md:88-92` already contains that path as prose, so a plan quoting it inside a copy-pasteable shell block could be blocked when pasted. Narrow, and no current plan does it. Worth a one-line caution in plans, not a code change.

## Thoughts and trade-offs

- **Wording, not architecture.** Every fix here is prompt text. There is no code path to change, so the risk is low and the changes are easy to review by reading the diff. The corresponding cost is that these prompts are the only enforcement — nothing checks that a model obeys them, so each rule must be unambiguous rather than merely suggestive.
- **The three requested changes pull in opposite directions.** Ranking best-to-worst makes the plan easier to act on; a shorter decision section makes it quicker to read. Doing both risks losing the detail that makes a decision safe. That is why the trimming is scoped by Q2 rather than decided here, and why the saved plan is the surface Tim loses nothing from.
- **"Tidy up" needs a boundary, not just an instruction.** Left unbounded, a documentation step invites workers to rewrite files nobody asked them to touch. The scope below is deliberately narrow: update a `docs/` record only where the change made it inaccurate, never create a new document, never create a log file. This follows the existing pattern in `docs/HARNESS-DESIGN.md:317` and the "Don't touch unrelated code" rule in `AGENTS.md`, so it needs no new decision.
- **One writer per file matters here more than usual.** Five of the six tasks touch `prompts/audit-plan-fast.md`. They are separate tasks for traceability, not for parallel dispatch; the batch table below enforces the order.
- **Uncommitted state is a hazard, not a detail.** Every file under audit is untracked. An implementer that assumes HEAD describes the current prompts will edit the wrong baseline. Each task below requires re-reading the file before editing.

## Optional improvements — not approved, do not implement

- Use the unused per-task `thinkingLevel` override to push expensive verification reviewers higher.
- Add a standing caution against embedding absolute COMP3888 `repos/` paths in copy-pasteable shell blocks inside plans.
- Apply the same ranking and verbosity treatment to `prompts/audit-plan.md` and `prompts/implement.md`, so the paid workflow matches the fast one.

## Implementation tasks

Every task: re-read the file immediately before editing and confirm the cited line still says what this plan says. If it has drifted, correct the line reference, report the drift, and continue. Make the smallest edit that achieves the stated outcome. Do not reformat untouched lines.

### T1 — Always end the audit response with a copyable command block

**Owns:** `prompts/audit-plan-fast.md` (step 7, lines 189-202; the follow-up paragraph, lines 205-216)

Remove the bare inline `/implement-fast <document-path>` at `:194-195` — that literal placeholder is the thing being copied through. Add to step 7: the first-pass response ends with exactly one fenced text block containing `/implement-fast` and the actual plan path just written; quote any path containing spaces; never leave a placeholder; this applies to the run that writes the plan as well as to later answer follow-ups. Make the ordering explicit so the command is the last thing on screen, which means the Your decisions section comes immediately before it. Make the follow-up paragraph point at that same rule rather than restating it separately, so the two paths cannot drift apart again. Keep the existing "Plan written to:" line on its own line first (`:190-192`) — it is correct and well specified.

**Acceptance:** no unresolved `<document-path>` placeholder remains in the numbered steps; the first-pass and follow-up paths share one rule; a reader can tell which element of the response is last. **Verify:** read the file back; `grep -n "document-path" prompts/audit-plan-fast.md` shows no placeholder-bearing command instruction.

### T2 — Rank findings and tasks best-to-worst in the plan

**Owns:** `prompts/audit-plan-fast.md` (step 5 combine paragraph, step 6 bullets "Prioritised findings" and "Implementation tasks", step 7 summary)

Replace the bare label "Prioritised findings" (`:94`) with an actual ranking rule, and say what the order is based on. State the criteria plainly, roughly: a must-fix band first for anything affecting security, data loss, correctness or a broken non-negotiable rule; then best value to Tim; then least effort. Require each implementation task to carry an explicit rank or band so a separate implementer does not re-guess it. Keep "prerequisites first" (`:99`) and state that a prerequisite overrides rank. Apply the same best-to-worst order to the chat summary at `:193`, so the short response and the plan agree.

**Acceptance:** the file contains sort criteria, not just the word "prioritised"; tasks carry a rank; the prerequisite-override rule is stated; the chat summary inherits the order. **Verify:** read the file; confirm each of the three words a reader would search for — the criteria, the per-task rank, and the prerequisite override — is present.

### T3 — Dispatch the highest-ranked ready task first

**Owns:** `prompts/implement-fast.md` (step 2, lines 38-39; step 3, line 40)

Add the missing half of the rule: among tasks that are ready to run now, dispatch the highest-ranked first; a high-ranked task blocked by a lower-ranked prerequisite yields to that prerequisite rather than stalling or violating the prerequisite order. State the fallback for a plan with no rank field: use the plan's own order and say so in the final report. Without this, T2's ranking reaches the plan and then goes unused.

**Acceptance:** the rank-versus-readiness interaction is explicit; a plan without ranks has a defined fallback. **Verify:** read the file; confirm the fallback is stated.

### T4 — Tidy up the documentation after an implementation run

**Owns:** `prompts/implement-fast.md` (new step between the current steps 8 and 9; step 8's record contents)

Add a step that runs after the combined checks and before the final response. Scope it: update a design record under `docs/` only where this run made it inaccurate — specifically `docs/HARNESS-DESIGN.md` when an intentional harness decision changed, which that document's own checklist item 9 (line 317) already requires. Update a tracked-path or command list in `README.md` or `HANDOVER.md` only where the change made that list wrong. State the prohibitions plainly: do not create new documentation files, do not create log files, do not rewrite the original diagnosis to match the fix. Assign ownership: the coordinator owns the plan document and the `docs/` records, so no worker and the coordinator write the same file, and record the doc updates in the same Implementation record as the code changes so the two cannot be reported separately. Do not add documentation work to a worker's brief unless the worker owns a document the change invalidates.

**Acceptance:** a deliberate harness change now has a named instruction that updates `docs/HARNESS-DESIGN.md`; new files and log files are forbidden; file ownership between coordinator and workers is stated. **Verify:** read the file; confirm the prohibitions and the ownership rule are present and that the step sits after the checks step.

### T5 — Give the plan document one fixed tail layout

**Owns:** `prompts/audit-plan-fast.md` (step 6, lines 107-113 — create the headings), then `prompts/implement-fast.md` (step 8, line 99), then `prompts/decisions.md` (step 4, line 52)

Define the order once, at plan creation, and make the later appenders follow it. The layout: plan body, then `## Your decisions`, then its `### Answered decisions` subsection, then `## Decision records`, then `## Implementation record`. Create those two record headings as empty placeholders when the plan is written, so the appenders have a real anchor. Change `implement-fast.md:99` and `decisions.md:52` from "at the end of the document" to "under `## Implementation record`" and "under `## Decision records`" respectively, and tell each to create its heading under the correct parent if it is somehow missing, and to preserve `### Answered decisions`. Records must be `##`-level siblings so they cannot nest inside a `#### Option A` block.

**Depends on:** T1, T2 (same file, so ordered after them). T4 shares `implement-fast.md` and must not run concurrently with this task.

**Acceptance:** one layout is stated in one place; the headings exist from plan creation; both appenders name their heading; the nesting hazard is closed. **Verify:** read all three files; confirm no prompt still says records go to "the end of the document" without naming a heading.

### T6 — Adopt a dedicated folder for plans

**BLOCKED by Q1. Do not start until Tim answers.** A sensible default exists, but the answer changes which files change, so guessing would be wrong.

**Would own:** `prompts/audit-plan.md:26-27`, `prompts/audit-plan-fast.md:83-84` and the example at `:192`, `prompts/implement-fast.md:23`, `prompts/decisions.md:13-14`, `docs/HARNESS-DESIGN.md:61,65,78`, `README.md:14-22`, and this plan file's own location.

**Depends on:** Q1. Shares `prompts/audit-plan-fast.md` with T1, T2, T5, so it runs after them.

**Acceptance once unblocked:** whichever option Tim chooses, every place that names a plan location agrees with every other place; the folder is created if missing; no change is made to `prompts/pisave.md`, `.gitignore` or `extensions/protected-paths.ts`, which already handle a subfolder correctly. **Verify:** search the repository for `docs/<short-topic>-plan.md` and confirm no stale copy remains; confirm no prompt still says a plan lives directly in `docs/` if a subfolder was chosen.

### T7 — Shorten the decision questions

**BLOCKED by Q2. Do not start until Tim answers.** How far to cut is a readability judgement about Tim's own reading, which inspection cannot supply.

**Would own:** `prompts/audit-plan-fast.md` lines 118-123, 129-132, 138-139, 141-146, 150-151, 155, 156-163, 168-170, 176-180, 193, 199-202, and parts of `prompts/implement-fast.md:134-146` and `prompts/decisions.md:30-42` if Q2 Option B or C is chosen.

**Depends on:** Q2. Shares `prompts/audit-plan-fast.md` with T1, T2, T5.

**Acceptance once unblocked:** whichever option Tim chooses, the three prompts do not contradict each other about the shape of a decision question, and no fact that could change a choice is lost. **Verify:** read all three files; for each of the redundant passages listed in finding 4, confirm it is either removed or no longer duplicated elsewhere.

### T8 — Optional extras

Not approved. Leave alone. See "Optional improvements".

## Parallel execution batches

One writer per file in every batch. **All `prompts/audit-plan-fast.md` tasks run in sequence, never in parallel** — T1 → T2 → T5 → T6 → T7, all by the same writer, in that order.

**Batch 1 — independent, run together**

- T1 → `prompts/audit-plan-fast.md`
- T3 → `prompts/implement-fast.md`
- T4 → `prompts/implement-fast.md` — **not concurrent with T3.** These two tasks share a file; give them to one writer, T3 then T4, in a single batch.

So Batch 1 has two writers: one owns `prompts/audit-plan-fast.md` (T1), the other owns `prompts/implement-fast.md` (T3 then T4).

**Batch 2 — after Batch 1**

- T5 → `prompts/audit-plan-fast.md` (needs T1 and T2 landed), then `prompts/implement-fast.md` and `prompts/decisions.md`. Sequential within the task, because T4 may still be settling `implement-fast.md` from Batch 1.

**Batch 3 — after Tim answers Q1 and Q2**

- T6 → the six files listed above, sequentially, one writer at a time, since `audit-plan-fast.md` and `implement-fast.md` are already in use by earlier tasks.
- T7 → `prompts/audit-plan-fast.md` and, for Option B or C, the two other prompts.

**File-ownership table**

| File | Writer | Tasks |
|---|---|---|
| `prompts/audit-plan-fast.md` | single writer, serial | T1, T2, T5, T6, T7 |
| `prompts/implement-fast.md` | single writer, serial | T3, T4, T5, T6, T7 |
| `prompts/decisions.md` | any worker, after T5 | T5, T6, T7 |
| `prompts/audit-plan.md` | any worker, after T5 | T6 |
| `docs/HARNESS-DESIGN.md` | any worker, after T5 | T6 |
| `README.md` | any worker, after T5 | T6 |
| this plan file | coordinator only | Implementation record, Decision records |

## Final combined verification

Run after all approved tasks, in this order. These are the only checks available for Markdown prompts — there is no test suite, and none of this can be proven by parsing alone.

1. `cd "$HOME/.pi/agent" && git status --porcelain` — confirm the expected files changed, the 7 untracked paths and 20 modified files listed at the top of this plan are intact, and nothing outside the file-ownership table was touched.
2. Read each changed prompt back in full. This is the real check: a prompt is only correct if it reads correctly as English instructions.
3. Confirm the prompts agree with each other on the things that must not drift: the decision-question shape (across all three prompts), the record headings, and the plan location.
4. `grep -rn "document-path\|reply examples\|at the end of the document" prompts/` — expect no unresolved placeholder command and no appender that targets a bare "end of the document".
5. `git diff --stat` and read the diff. The change should be a small number of edited lines in Markdown files and nothing else.
6. Not verifiable by inspection, and honestly so: whether a model actually obeys the new rules at runtime. The first real test is the next `/audit-plan-fast` run — check that its closing message ends with a copyable block containing the real path, that findings arrive best-to-worst, and that the questions read shorter. Record the result in this document's Implementation record.

**Checks that could not be run and why:** no automated test exists for prompt behaviour, and running a live audit would require dispatching real subagents against a real project — outside this plan's read-and-edit scope. The COMP3888 `repos/` bash-blocking hazard in finding 7 was reasoned from `extensions/protected-paths.ts:47-53` and not reproduced, because reproducing it needs a write attempt against a protected path.

## Boundary between core and optional work

**Core, implement now:** T1, T2, T3, T4, T5.

**Core but paused — start only when Tim answers:** T6 (needs Q1), T7 (needs Q2). If unanswered by the time the run ends, record them as blocked in this document. Do not implement the default on your own initiative; a recommendation, silence and a general "go ahead" are not approval.

**Out of bounds — do not touch:** `extensions/`, `settings.json`, `agents/`, `AGENTS.md`, the subagent concurrency and task limits, notification behaviour, protected paths, model configuration, and any file not named in a task. Leave the existing uncommitted work in this repository exactly as found.

**Not approved — leave alone:** T8 and the whole "Optional improvements" section, including the `thinkingLevel` override, the COMP3888 path caution, and applying the same treatment to `prompts/audit-plan.md` and `prompts/implement.md`.

**Record rules for the implementer.** This document is the single record. Do not create a separate log, report or summary file. Preserve the original findings, tasks, creation metadata and questions exactly as written. Update only the **Implementation status** line in the header. Append a short dated entry under `## Implementation record` at the end of the document when a run ends — complete, partial or blocked. Later runs append; they never overwrite. Do not rewrite the original diagnosis to match what you implemented. Do not mark answered questions as implemented, and do not treat a recommendation as an answer. Where a decision was received, reference the `## Decision records` entry rather than duplicating it.

## Your decisions

2 open questions:

1. Where should plan files live?
2. How much should the questions asking you for a decision be shortened?

### Q1 — Where should plan files live?

**What you are deciding**

Whether new plans should be written into a dedicated `docs/plans/` folder, keep going straight into `docs/` with only a filename rule, or go into a new top-level `plans/` folder beside `docs/`. You asked whether a dedicated folder is smart; this is that question. It affects the two commands that write plans, the two commands that search for plans, the design record and the README. It does not affect any code, and nothing you have already saved depends on it.

**What happens now**

Both audit commands hard-code the same default: a plan is written to `docs/<short-topic>-plan.md` (`prompts/audit-plan.md:26-27`, `prompts/audit-plan-fast.md:83-84`, with the same shape echoed as an example at `audit-plan-fast.md:192`). Today `docs/` holds exactly one file, `docs/HARNESS-DESIGN.md` — the harness's design record, which is the thing future reviewers are pointed at. There is no `*-plan.md` file anywhere in the repository yet and no subfolder.

The two commands that look for a plan when you have not named one both fall back to "briefly check PLAN.md, docs/ and handover notes" (`prompts/implement-fast.md:23`, `prompts/decisions.md:13-14`).

The problem being solved is organisational. After a few audits, `docs/` would hold something like `HARNESS-DESIGN.md`, `login-fix-plan.md` and `harness-plan.md` side by side, with nothing on the page telling you which is settled design and which is a half-finished to-do list for an AI to follow. Both are Markdown files in a folder named `docs`.

Two things are already fine and need no work whichever option you pick. Backups: `/pisave` stages the whole `docs` folder, not just files directly inside it, so a subfolder is backed up automatically — verified with `git check-ignore`, which reports nothing under `docs/` is ignored, and by the fact that `extensions/subagent/index.ts` is already tracked from a bare `extensions` path. Safety: the protected-path extension blocks writes only inside the COMP3888 `repos` folder and to anything named `.env` or `.git`, so nothing under `~/.pi/agent/docs` is affected.

One harmless quirk: Git does not remember empty folders, so a brand-new `docs/plans/` will not appear in `git status` until the first plan lands in it.

#### Option A — Dedicated `docs/plans/` folder

**What would happen:** Both audit commands write new plans to `docs/plans/<short-topic>-plan.md`, creating the folder if it does not exist. The design record stays directly in `docs/`. The two commands that search for plans check `docs/plans/` first, then `docs/`. This plan document itself gets moved into `docs/plans/` by the task that does the move.

**Example:** Today `docs/` contains `HARNESS-DESIGN.md` and a plan called `feature-plan.md`. After this change, `docs/` contains only `HARNESS-DESIGN.md`, and `docs/plans/` contains `feature-plan.md`. The next audit writes `docs/plans/login-fix-plan.md` and ends with a copyable command reading `/implement-fast docs/plans/login-fix-plan.md` — the folder is in the path, so it is obvious which command goes with which plan.

**Benefits:** Plans are grouped in one place, so listing or archiving them is one command instead of a search. The design record keeps `docs/` to itself and stays the obvious first thing to read. No change is needed to `/pisave`, `.gitignore` or the protected-path rules. Both search commands already look inside `docs/`, so discovery keeps working with a small wording change.

**Downsides and consequences:** Nine lines change together across six files, so the edit is broad but shallow. For a while the old wording and the new wording will both exist in your history, so plans made before the change stay where they are. **Existing plan files are not moved automatically** — this plan document would be moved because it is the one being implemented; older plans elsewhere are a separate choice, not part of the task. If you change your mind later, the prompts are the only place the default lives, so it is a small revert, and nothing saved or already written is lost.

#### Option B — Keep `docs/` and add a filename rule

**What would happen:** Plans keep landing directly in `docs/`, but every plan filename must start with a fixed prefix such as `plan-`, so they stand out from design records. The design record keeps its own name.

**Example:** Today `docs/HARNESS-DESIGN.md` and `feature-plan.md`. After this change, `docs/HARNESS-DESIGN.md` alongside `plan-feature.md` and `plan-harness.md`.

**Benefits:** The smallest possible change — one line in each audit command, and no edits at all to the two search commands, because they already look in `docs/`. Nothing has to be moved, so there is no risk of a path breaking.

**Downsides and consequences:** The folder still mixes settled design records with in-progress plans, which is the readability problem in the first place. A prefix is a convention only: rename a file by hand and nothing fails, and nothing warns you. This option does not create a dedicated planning folder, so it does not answer your original question — it is here because it is a legitimate smaller answer, not because it is better.

#### Option C — Top-level `plans/` folder beside `docs/`

**What would happen:** Plans go to `plans/<short-topic>-plan.md`, a sibling of `docs/` rather than a child. The design record stays in `docs/`.

**Example:** `plans/feature-plan.md` sitting next to `docs/HARNESS-DESIGN.md`.

**Benefits:** The separation is at the top level, so it is visible at a glance in any file listing. This is the right answer if plans ever need to be treated differently from documentation — for example excluded from documentation tooling.

**Downsides and consequences:** `/pisave` backs up a fixed list of folders: `.gitignore AGENTS.md HANDOVER.md README.md settings.json agents docs extensions prompts skills` (`prompts/pisave.md:9`). A new top-level `plans/` folder is **not** on that list, so plans would silently stop being backed up unless that file is edited as part of this change. That is an extra file to get right and a quiet way to lose the backup of every plan. It also splits the things pi reads across two folders, and the two search commands would need the new location added.

**My recommendation and why:** Option A. It does what you asked for with the least downside, because the folder sits inside `docs/` — which `/pisave` already backs up and which both search commands already look inside — so only prompt wording changes and nothing about backups or safety moves. Option B is the better pick if you want the smallest possible edit and are content to leave the folder mixed. Option C is the better pick only if you expect plans to stop being documentation, which is not how they are used.

**What is still uncertain:** How many plan files you already have elsewhere is not something this repository can tell me. This harness's prompts are used against your other projects too — RELT, COMP3888 and the Godot project each have their own `docs/` or `ai-notes/docs/`, and those projects' existing plans are unaffected; only the wording of these prompts changes. Whether older plans should be relocated at the same time is a separate choice and is not part of the task.

**If unanswered:** Nothing changes — plans keep going to `docs/<short-topic>-plan.md`. T6 pauses, and with it the plan-location wording edits in `prompts/audit-plan.md`, `prompts/decisions.md`, `docs/HARNESS-DESIGN.md` and `README.md`. T7 pauses for its own separate reason (Q2). T1, T2, T3, T4 and T5 continue and finish normally, because none of them depends on where plans live.

### Q2 — How much should the questions asking you for a decision be shortened?

**What you are deciding**

How far to cut the length of the "Your decisions" section. You said you would like it a little less verbose, and the current rules actively push against that, so the amount to cut is a choice about how you read rather than something the files can settle. It affects `/audit-plan-fast` in chat, and depending on the option, the plan file and the other two commands that raise questions.

**What happens now**

`/audit-plan-fast` sets a layout that applies "in both the saved plan and final chat" (line 127). For each question it demands four fixed blocks — What you are deciding, What happens now, My recommendation and why, What is still uncertain — and inside **every** option four more labels: What would happen, Example, Benefits, and Downsides and consequences (lines 152, 154, 157, 158). A question with three options is therefore 4 + 12 = 16 labelled blocks, shown in chat as well as written to the file.

The other two commands use a much shorter shape for the same kind of question. `/implement-fast` (lines 134-146) and `/decisions` (lines 30-42) both use four labels — Question, What happens now, Options, Recommendation — and write all the option detail as prose inside the single `Options:` block. So the same open decision looks different depending on which command raised it, and `audit-plan-fast.md:200-202` explicitly forbids the compression the short form performs ("Do not compress the options into bare lists"). No prompt says the difference is deliberate.

Not all of that length is doing work. What a reviewer found, all with line references: the numbered title list at lines 131-132 is added purely as a guide and explicitly "does not replace the full explanations". "What happens now" (141-146) and "What is still uncertain" (168-170) ask for the same unverified-facts content twice. Line 155 puts the cross-option instruction "Compare options using the same starting situation" inside a per-option label, where a single option cannot satisfy it. Three separate "do not invent" cautions appear at 156, 162 and 163. Line 138-139 restates the question that the `### Q1` heading above it already states. Lines 118-123, 176-180 and 199-202 push hard against brevity, including "Do not cut these explanations just to keep the final response short". There is also a contradiction inside one section: line 193 says summarise "briefly", and lines 200-201 say "Carry over the complete decision explanations".

**Example, the same question under each option:** you are choosing where plans should live, with three options — `docs/plans/`, `docs/` with a prefix, or a top-level `plans/`. Today the chat shows you 16 labelled blocks: four per question plus four inside each of the three options. Under Option A below, the saved plan still shows 16, and the chat shows 4 with the three options written as short paragraphs. Under Option C, both show about 10.

#### Option A — Trim the wording, keep every label and both surfaces

**What would happen:** The structure stays exactly as it is. The duplicated sentences are removed, the three "do not invent" cautions merge into one, and the mis-scoped comparison instruction moves out of the per-option label. The chat still carries the full 16-block form for a three-option question.

**Example:** The three-option plan-location question still shows 16 labelled blocks in chat, dropping to roughly 13 because "What happens now" and "What is still uncertain" become one block, and the comparison instruction no longer has to be awkwardly repeated inside each option. Same information, fewer blocks.

**Benefits:** Nothing that could change your choice is lost, because no label disappears. `/implement-fast` and `/decisions` are untouched, so there is no new consistency work. It is the smallest and most predictable edit.

**Downsides and consequences:** The chat stays long, which is the surface you read most often, so it does not really deliver what you asked for. The same question still looks different in `/audit-plan-fast` than in the other two commands. Changing to a bigger option later would mean a second pass over the same text. Nothing is lost or broken if you change your mind.

#### Option B — Long form in the plan, short form in chat

**What would happen:** The saved plan keeps the full long form, so nothing is lost on disk. The chat, `/implement-fast` and `/decisions` all use the short four-label form that the latter two already use. One question, two lengths, both written down.

**Example:** `docs/plans/plan-location-plan.md` keeps the complete form — What you are deciding, What happens now, each option's What would happen / Example / Benefits / Downsides and consequences, My recommendation and why, What is still uncertain. The chat version of the same question shows Question, What happens now, Options (the three options as short paragraphs with their trade-offs), and Recommendation. The chat would not point you to the plan to understand the choice; it would tell you everything needed to answer.

**Benefits:** The three commands stop disagreeing about shape, so a question is recognisable whichever one raised it. The chat drops to roughly a quarter of its current length for a typical three-option question, which is exactly where you said it was too verbose. The plan on disk keeps every fact, so nothing needs re-auditing later. This is smaller than it sounds, because two of the three commands already work this way.

**Downsides and consequences:** The chat gives up the "one labelled block per fact" structure, and the current rule at lines 127 and 200-202 that forbids compressing options has to be edited. The guarantee that you can decide without opening the plan would then rest on good writing rather than on a required label. With three or four options that have real trade-offs, one flowing `Options:` paragraph is harder to scan than four labelled blocks — that is the main cost. Changing back later is easy, because the plan form is untouched.

#### Option C — Merge labels, use one shape everywhere

**What would happen:** Fold "What is still uncertain" into "My recommendation and why", and fold "Benefits" into "Downsides and consequences" as a paired better/worse line. Four labels per option becomes two. The plan and the chat both use the merged form.

**Example:** The three-option question drops from about 16 labelled blocks to about 10, with each option reading as What would happen, Example, Better, Worse.

**Benefits:** The largest cut of the three while keeping the substance. The labels that survive are the ones carrying facts the others do not, so the trimming is targeted rather than arbitrary. One shape everywhere, so the inconsistency goes away entirely.

**Downsides and consequences:** Plan files already written under the current labels would not match the new template, so a later `/decisions` run on an old plan may reformat it. This carries the highest risk of quietly dropping something, because a benefit that never appears as a downside can be lost in the merge without anyone noticing. It also reaches into the wording of `/implement-fast` and `/decisions` to keep them aligned, so it is the widest edit of the three.

**My recommendation and why:** Option B, plus the wording cleanup from Option A — that cleanup is part of B's edit rather than a separate choice. It targets the exact place you said was too verbose, the chat, while leaving the complete record in the plan, and it makes the three commands agree with each other, which is a correctness fix as much as a length one. The main trade-off is that the chat loses its labelled structure, which matters most when an option has a long list of consequences — and that is exactly the case where the plan is still there. Option A is the better pick if you want no risk at all of losing detail in chat. Option C is the better pick only if you find even the short form too long.

**What is still uncertain:** I have not measured how long these sections actually are in practice, because this repository has no completed plan to measure — `docs/` holds only `docs/HARNESS-DESIGN.md` and no `*-plan.md` file exists anywhere. So "roughly a quarter" is a count of required labels, not a measurement of a real response, and how much it actually costs you is unverified. If you have plans in your other projects written under the current rules, reading one would settle it.

**If unanswered:** The long form stays in both the plan and the chat, and the mismatch with `/implement-fast` and `/decisions` stays. T7 pauses. T1, T2, T3 and T4 continue, and T5 and T6 can also proceed once their own questions are answered, because T5 concerns record headings and T6 concerns file location, neither of which depends on how long a decision question is.

## Decision records

Tim's answers are appended here, each with the actual date, time and UTC offset, the question ID, the chosen option or his own rule, the source of the answer and the tasks it affects. Later answers supersede earlier ones; nothing is overwritten.

### 2026-09-27 03:32:46 +10:00 — Tim's answers to Q1 and Q2, plus one custom rule

**Answer source:** Tim's own reply in the conversation that produced this plan, sent immediately after it was written. Not inferred from code, silence or a recommendation.

**Q1 — Where should plan files live? — Option A: a dedicated `docs/plans/` folder.**

- New plans are written to `docs/plans/<short-topic>-plan.md`. The folder is created if it does not exist.
- Both audit prompts use that default: `prompts/audit-plan-fast.md:83-84` and its example at `:192`, and `prompts/audit-plan.md:26-27`.
- The two prompts that search for a plan check `docs/plans/` first, then the rest of `docs/`: `prompts/implement-fast.md:23` and `prompts/decisions.md:13-14`.
- The convention is updated to match in `docs/HARNESS-DESIGN.md:61,65,78` and `README.md:14-22`.
- This plan document moves to `docs/plans/fast-prompts-plan.md`. No older plan is relocated; moving other plans was never part of the task.
- `prompts/pisave.md`, `.gitignore` and `extensions/protected-paths.ts` are **not** changed. Backups and write protection already work correctly for a subfolder, as verified in the findings.
- **Unblocks T6.** T6 no longer waits on a decision. Build Option A exactly as described in T6 and in Q1.

**Q2 — How much should the decision questions be shortened? — Option B, plus Option A's wording cleanup.**

- The saved plan keeps the full long form, so nothing is lost on disk.
- The chat, `prompts/implement-fast.md` and `prompts/decisions.md` use the short four-label form those two prompts already use: Question, What happens now, Options, Recommendation.
- Option A's wording cleanup applies as part of the same edit, not as a separate choice. Remove the duplication listed in finding 4: the title list that "does not replace the full explanations" (`audit-plan-fast.md:131-132`), the overlap between "What happens now" and "What is still uncertain" (`:141-146`, `:168-170`), the cross-option comparison instruction sitting inside the per-option `Example` label (`:155`), the three repeated "do not invent" cautions (`:156`, `:162`, `:163`), the restatement of the `### Q1` heading inside "What you are deciding" (`:138-139`), and the dangling "reply examples" reference (`:129-130`, contradicted at `:173`).
- `audit-plan-fast.md:127` ("in both the saved plan and final chat") and `:200-202` are edited so the long form is required of the saved plan rather than of the chat.
- **Unblocks T7.** T7 no longer waits on a decision. Build Option B exactly as described in T7 and in Q2.

**Custom rule from the same message — write the date and time into the plan and into the documentation the run produces.**

- Every entry under this `## Decision records` heading and every entry under `## Implementation record` carries the real system date, time and UTC offset, read from the clock at the moment of writing. Never invent, estimate or backdate a timestamp; if the clock is unavailable, say so.
- The tidy-up step created by T4 must write a dated record into the documentation it updates, following the pattern already used in this repository: a `## <change> record` section with `**Applied:** YYYY-MM-DD HH:MM:SS +HH:MM` on the next line, exactly as in `docs/HARNESS-DESIGN.md` at lines 234-236 ("Resource cleanup record") and 267-269 ("Efficiency cleanup record"). This follows the existing convention; it does not create a new one.
- The timestamp written is when the change was applied — not the plan's creation time and not the Git commit date.
- **Affects T4 and this plan's own `## Implementation record`.** One ownership point matters: T6 edits the prose in `docs/HARNESS-DESIGN.md`, while the dated record for the run is written once, at the end of the run, by the T4 step. Only the coordinator writes that record, after every worker — including T6 — has stopped editing the file, so the two never write the same section.

### 2026-09-27 03:44:54 +10:00 — Tim declines the optional extras

**Answer source:** Tim's own reply in the conversation, given directly after the T1–T7 implementation run finished: "nah just dont do the optional extras". Not inferred from silence, a recommendation or prior behaviour.

**Scope:** T8 and the whole "Optional improvements — not approved, do not implement" section, which is now **decided as declined**, not merely unapproved and pending:

- using the unused per-task `thinkingLevel` override to push expensive verification reviewers higher (finding 7, first item);
- adding a standing caution against embedding absolute COMP3888 `repos/` paths in copy-pasteable shell blocks inside plans (finding 7, second item);
- applying the same ranking and verbosity treatment to `prompts/audit-plan.md` and `prompts/implement.md` so the paid workflow matches the fast one.

**Effect:** no implementation work, no further checks and no follow-up task. The three items are closed. A future run must not pick them up from this plan; re-raising any of them needs a fresh, explicit request from Tim. `extensions/`, `prompts/audit-plan.md` and `prompts/implement.md` therefore keep their current wording, including `audit-plan.md`'s unranked "prioritised findings" and both paid prompts' existing decision-question shape.

**Unrelated to the record above:** this answer does not reopen Q1 or Q2, both already answered and applied.

## Implementation record

None yet. The implementer appends one short dated entry here at the end of each run — complete, partial or blocked — recording which task IDs completed, were skipped or were blocked and why, the files changed, the checks actually run with their exact commands and results, any checks not run, the decisions received and applied, and the current Git HEAD with whether uncommitted changes remain.

### 2026-09-27 03:41:36 +10:00 — T1–T7 implemented

**Run ended:** 2026-09-27 03:41:36 +10:00 (2026-09-26 17:41:36 UTC), read from the system clock at the moment of writing.

**Overall implementation status: Complete.** All seven approved tasks were implemented and read back. T8 (optional extras) was not approved and was not attempted.

- **T1 — done.** `prompts/audit-plan-fast.md` step 7 now ends the response with exactly one fenced ```text block holding `/implement-fast` and the real path just written; the Your decisions section sits immediately before it. The bare inline `/implement-fast <document-path>` is gone. The trailing "Answer follow-ups" paragraph now points at the step 7 rule instead of restating it.
- **T2 — done.** Step 6 now carries three ranking bands (must fix → best value → least effort) with a stated tie-break, requires every finding to carry its band, requires every implementation task to carry its finding's band, states that a prerequisite always overrides rank, and step 5 and step 7 now use the same best-to-worst order.
- **T3 — done.** `prompts/implement-fast.md` steps 2 and 3 now dispatch the highest-ranked ready task first, let a lower-ranked prerequisite win over a higher-ranked dependant, and fall back to the plan's own task order (reported in the final summary) when a plan has no rank field.
- **T4 — done.** `prompts/implement-fast.md` gained a new step 9 ("bring the documentation back in line with the code") between the checks step and the summary step; the old step 9 is now step 10 and step 8's cross-reference was updated to "step 10". The step forbids new documentation files and log files, forbids rewriting the original diagnosis, makes the coordinator the sole owner of the plan document and the `docs/` records, requires a `## <change> record` section with `**Applied:** YYYY-MM-DD HH:MM:SS +HH:MM` read from the real clock, and records the documentation updates in the same Implementation record as the code changes.
- **T5 — done.** The plan's fixed tail layout is defined once in `prompts/audit-plan-fast.md` step 6 — plan body, `## Your decisions` (with its `### Answered decisions` subsection), `## Decision records`, `## Implementation record` — and the two record headings are created as empty placeholders at plan creation. `prompts/implement-fast.md` step 8 now appends under `## Implementation record` and `prompts/decisions.md` step 4 under `## Decision records`, each creating its heading if missing, preserving `### Answered decisions`, and keeping records as `##`-level siblings so they cannot nest inside a `#### Option A` block.
- **T6 — done (Q1 Option A).** Plans are written to and searched under `docs/plans/`: `prompts/audit-plan-fast.md` (default path and "Plan written to:" example), `prompts/audit-plan.md` (default path, folder created on demand), `prompts/implement-fast.md` and `prompts/decisions.md` (both search `docs/plans/` first, then the rest of `docs/`), `docs/HARNESS-DESIGN.md` (new decision 13 plus both workflow example commands), and `README.md` ("What's tracked" list). `prompts/pisave.md`, `.gitignore` and `extensions/protected-paths.ts` were deliberately left unchanged, as the finding recorded. This document itself was moved to `docs/plans/fast-prompts-plan.md` by the coordinator at the end of the run; no other plan was relocated.
- **T7 — done (Q2 Option B plus Option A's wording cleanup).** The saved plan keeps the long form (What you are deciding / What happens now / My recommendation and why, with What would happen / Example / Benefits / Downsides and consequences under each option). The final chat now has its own four-block CHAT LAYOUT — Question, What happens now, Options, Recommendation — matching the shape `prompts/implement-fast.md` and `prompts/decisions.md` already use, and both of those prompts now say in one short clause that the saved plan may hold the fuller form. Removed as redundant: the numbered title list that "does not replace the full explanations", the separate "What is still uncertain" block (its content now sits inside "What happens now", so no fact is lost), the cross-option comparison instruction that sat inside the per-option **Example** label, the three repeated "do not invent" cautions (now one), the restatement of the `### Q1` heading inside "What you are deciding", and the dangling "reply examples" reference. The "prioritise completeness over brevity" and "do not cut these explanations" pushes are now scoped to the saved plan instead of the chat.

**Run interruption and its effect.** The three parallel workers were dispatched in one batch, one writer per file, and all six files were written between 03:37:53 and 03:38:41. The pi session then dropped the workers' result feed: the dispatch returned no results and no worker report was ever collected. The coordinator therefore verified every changed file directly instead of relying on worker reports, and found T7 incomplete in `prompts/audit-plan-fast.md` — step 7 had already been pointed at a "short CHAT LAYOUT below" that the worker never wrote, leaving a dangling cross-reference. The coordinator finished that one file's T7 edit directly. No other file showed a partial edit, and no worker left a file unparseable.

**Files changed:** `prompts/audit-plan-fast.md`, `prompts/implement-fast.md`, `prompts/decisions.md`, `prompts/audit-plan.md`, `docs/HARNESS-DESIGN.md`, `README.md`, and this document (moved to `docs/plans/`, header status updated, this entry appended). Nothing else was touched.

**Documentation updated by this run:** `docs/HARNESS-DESIGN.md` gained decision 13 (plan location) and its two workflow example commands were corrected to the `docs/plans/` shape; `README.md` gained a `docs/plans/` entry in "What's tracked". A dated "Fast workflow prompts record" section was appended to `docs/HARNESS-DESIGN.md` by the coordinator after every worker had stopped editing it.

**Checks actually run** (all from `C:\Users\Tim\.pi\agent`, read-only commands):

1. `git status --porcelain` — passed. The same 20 modified/deleted tracked files and 7 untracked paths listed at the top of this plan are intact. Nothing outside the plan's file-ownership table was touched.
2. `git diff --stat` — passed. Changes are Markdown prompt/document edits only, plus the pre-existing unrelated modifications that were already there at audit time.
3. `grep -rn "document-path\|reply examples\|at the end of the document\|at the end of the same source plan" prompts/` — passed. The only remaining hits are the prohibitions themselves ("Never leave a placeholder such as `<document-path>`", "Do not print … combined reply examples"), not placeholder-bearing instructions.
4. `grep -n "## Decision records\|## Implementation record" prompts/*.md` — passed. One layout, defined once; all three prompts name their heading.
5. `grep -rn "docs/plans\|docs/<short-topic>" prompts/ README.md docs/HARNESS-DESIGN.md` — passed. Every plan location in the repository agrees on `docs/plans/`; no stale `docs/<short-topic>-plan.md` remains.
6. `grep -n "What is still uncertain\|in both the saved plan and final chat\|Do not compress the options" prompts/audit-plan-fast.md` — passed, no matches. The old both-surfaces layout is gone.
7. Full read-back of `prompts/audit-plan-fast.md`, `prompts/implement-fast.md` and `prompts/decisions.md`, and of every changed region of `prompts/audit-plan.md`, `docs/HARNESS-DESIGN.md` and `README.md` — passed. Step numbering in `prompts/implement-fast.md` is 1–10 with no stale cross-reference.
8. `grep -n "in step [0-9]\+\|step [0-9]\+ of" prompts/implement-fast.md` — passed. The only cross-references are to step 7 (checks) and step 10 (the summary), both correct after the renumbering.

**Checks not run, and why.** No automated test exists for prompt behaviour, and none can: a prompt is only correct if it reads correctly as English instructions, which the read-back covered. Runtime obedience is unverified — the first real test is the next `/audit-plan-fast` run, which should end with a copyable block holding the real path, list findings best-to-worst, and show the short chat form. The COMP3888 `repos/` bash-blocking hazard in finding 7 was not reproduced, because reproducing it needs a write attempt against a protected path; it remains unapproved optional work.

**User decisions received and applied.** All three came from the one dated Decision record earlier in this document (2026-09-27 03:32:46 +10:00), answered by Tim in the conversation that produced this plan: Q1 Option A (dedicated `docs/plans/` folder) → applied in T6; Q2 Option B plus Option A's wording cleanup → applied in T7; and Tim's custom rule that every record carries a real clock timestamp and that updated documentation gets a `## <change> record` with `**Applied:**` → applied in T4 and in this entry. Both questions were answered before implementation began, so no task ran paused and no new question was raised. No decision was inferred from a recommendation, from silence or from the code.

**Current Git HEAD:** `cb4302b39308ec15c562230109bf07f9652de469` ("feat: install Accordion context-folding extension (npm:@a-fig/accordion)"), branch `main`, last commit 2026-08-26 06:54:25 +1000. This HEAD is unchanged from the audit and contains **none** of the work described here. All 20 modified and 7 untracked paths remain uncommitted, exactly as they were at audit time; nothing was staged or committed by this run.
