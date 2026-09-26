---
description: Implement one or more existing plans with coordinated parallel workers
argument-hint: "[plan text or document paths; otherwise use the conversation or find a plan]"
---
Implement the supplied plan or plans using a speed-first workflow. Avoid repeating an audit
or planning exercise already completed. Optimise time to a verified working result,
not worker count. Follow project instructions and preserve unrelated changes.

Communication: work quietly until the final response. Do not send acknowledgements,
progress updates, batch announcements or running commentary. Pass this instruction
on to every worker: no commentary, only a concise final result to the coordinator.
Keep worker results and tool calls needed for coordination and verification; the
interface may still show tool activity. Do not skip checks to reduce visible output.
Collect questions, corrections and blockers for the final response rather than
waiting for the user during execution. Never guess approval: pause affected tasks
and continue independent approved work. If no safe work can proceed, finish with
the blocker and the question needed to continue. Required permission gates still apply.

Plan input: $ARGUMENTS
- Use supplied plan text, or read ALL explicitly supplied plan document paths.
  Multiple explicit plans are intentional, not ambiguous: coordinate them together.
- Otherwise use the clearly identified current plan or plans in this conversation.
- Otherwise briefly check docs/plans/ first, then the rest of docs/, then PLAN.md
  and handover notes for an applicable plan.
- If several plans are plausible, stale, or none is found, stop with a final
  clarification question rather than guess.

1. Briefly inspect only what is needed to establish file ownership, dependencies
   and checks. Do not blindly trust file paths or assumptions in the plans.
   For multiple plans, reconcile duplicate tasks, overlapping files, shared interfaces
   and dependencies BEFORE dispatch. Track tasks by source plan and task ID. Give
   each shared file one owner across ALL plans in a batch. Save conflicting
   requirements as questions for the final response rather than silently choosing
   a plan; pause affected tasks and continue unaffected work.
   Respect explicit user file boundaries and flag other active implementation
   sessions: this coordinator cannot enforce ownership outside its own workers.
2. Split substantial independent work into tasks. Assign one writer per file,
   including shared scenes, resources, configuration and generated files. Agree
   shared interfaces before starting dependent workers. Run prerequisites first;
   dispatch each subsequent ready batch together using subagent tasks.
   Among tasks that are ready to run now, dispatch the highest-ranked one first, so
   an early result unblocks the most downstream work. A higher-ranked task that is
   blocked by a lower-ranked prerequisite yields to that prerequisite: run the
   prerequisite first rather than stalling or violating the prerequisite order. If
   a plan gives its tasks no rank or band, use the plan's own task order and say so
   in the final report.
3. Prefer wide ready batches: dispatch up to 12 useful independent workers together
   rather than small serial batches. Keep that ranked-first order within and across
   batches. The local tool runs up to 12 at once and accepts
   up to 64 tasks per call, queuing the rest; respect the active tool's limits.
   These are ceilings, not targets. Do not manufacture tiny tasks to fill slots.
   For a small or tightly coupled change, implement directly or use a single worker.
4. Give each worker its relevant plan details, owned files, shared interfaces,
   acceptance criteria and targeted checks. Workers must inspect relevant code,
   stay within ownership, avoid nested delegation, and return concise results:
   changed files, checks actually run, failures and blockers. Batch independent
   reads/edits/commands where supported to reduce model round trips.
   Implement only core/explicitly approved tasks; leave optional work out. If code
   contradicts a task's diagnosis or material assumptions, do not invent a different
   fix: mark it blocked with file/symbol evidence, pause dependent tasks and continue
   unaffected work. Harmless path/line drift may be corrected after confirming the
   same target and intended behaviour. Report the correction.
   Read each plan's Your decisions/questions section, decision records and available
   explicit user answers before dispatch. Preserve question IDs, option labels and meanings;
   qualify IDs by plan name if multiple plans reuse an ID. Do not ask answered
   questions again. If an answer's meaning is ambiguous or conflicts with another,
   leave only that choice unresolved rather than guess. Pass relevant question
   IDs, answers and if-unanswered outcomes to workers. Check factual unknowns in
   code before asking. Existing behaviour is evidence, not proof of desired design.
   Silence, a recommendation or a generic instruction to implement is NOT approval
   of an unresolved decision. Do not wait on a timer: preserve existing behaviour,
   block affected tasks and their dependants, and continue independent approved work.
   Apply explicit user answers where supplied; report newly discovered decisions
   with options, a recommendation, affected tasks and an if-unanswered outcome.
   Routine implementation details may be chosen only within approved scope, following
   existing patterns without altering intended gameplay, public interfaces, saved
   data or security. Keep meaningful choices visible in the final report. Easy to
   revert does not by itself justify guessing a design decision. Do not build two
   systems to avoid asking. Use a small toggle/setting only if explicitly approved
   or following an existing config pattern within approved scope, preserving the
   current default and checking supported options; never add unapproved features.
5. Keep dependency installation, shared generated output and project-wide checks
   under one owner. Do not run checks against files other workers are still editing.
   Preserve parallel reading/coding, but give memory-heavy builds/tests one execution
   slot per coordinator; workers return their check commands instead of racing them.
   Follow AGENTS.md's guarded-runner policy for new/modified Node checks, with finite
   time and memory budgets. Pass this requirement to every worker. Coordinate with
   other active sessions: this slot does not enforce a machine-wide limit.
6. After each batch, unblock the next one. Fix failures in parallel where ownership
   allows. If provider throttling or resource exhaustion occurs, reduce concurrency
   instead of spawning more workers. Report persistent blockers; do not retry forever.
7. After all edits, run the relevant combined build/tests or Godot validation in
   dependency order. Resolve integration failures before claiming completion.
   Report any checks that could not be run. Do not replace verification with an
   automatic extra full audit unless requested or warranted by a concrete risk.
   For Godot, use the project's verification runner when available. Bound EVERY
   headless command with a wall-clock timeout (use project limits, otherwise 120s
   per command as a starting limit). Use a supported tool timeout or a process
   wrapper that terminates the launched process on expiry; --quit-after alone is
   not a wall-clock timeout. Report timeouts as failed checks, never passes.
   Where supported, parse-check relevant changed scripts using --headless --path
   <project> --check-only --script <script> before runtime smoke tests. Honour import
   prerequisites first; do not mistake missing imports for confirmed code bugs.
   Workers may check early only when inputs are stable and checks will not compete
   over shared caches. Parse checks do not replace runtime/integration checks.
8. Before the final response, the coordinator alone records the outcome in each
   source plan document, after workers have stopped editing it. Re-read it before
   editing to preserve unrelated changes. Do this for partial or blocked runs too,
   once a source plan is clearly identified; never update a guessed plan.
   Keep the original findings, tasks, questions, creation metadata and prior entries
   intact. Update or add only the header's Implementation status, then append a
   short dated entry under the `## Implementation record` heading. That heading is
   a `##`-level section after `## Decision records`; if it is somehow missing, create
   it in that position rather than appending anywhere else. Preserve the
   `### Answered decisions` subsection and all prior entries. Keep records as
   `##`-level siblings, so they can never nest inside a `#### Option A` block.
   Use Complete only when all required approved tasks and acceptance checks passed;
   otherwise use Partially complete if any work was done, or Blocked if none could
   proceed. Explicitly distinguish optional/unapproved tasks from required work.
   Each entry includes:
   - Run ended: actual system date, time and explicit UTC offset. This is not a
     claim the plan finished. Mark unavailable clock information rather than guess.
   - Overall implementation status; completed, skipped, blocked or unfinished task
     IDs with brief reasons, plus the main changes and affected files.
   - Checks actually run with commands and results, failures and checks not run.
     Include combined checks covering interactions between plans where applicable.
   - User decisions received and applied: reference existing Decision records rather
     than duplicate them; for newly received answers include question ID, option or the user's
     own rule, and source (conversation message or document section). Distinguish
     accepted answers from changes actually implemented. Keep unanswered choices
     open; never infer approval from recommendations or completed code. Record
     new/unresolved questions in the full decision format in step 10, alongside
     remaining blockers and the exact next step.
   - Current Git HEAD and whether uncommitted changes remain, where available;
     do not imply uncommitted implementation work is contained in that commit.
   - Documentation updates made in step 9: which record or tracked-path list changed,
     what this run made inaccurate, and the dated record heading added.
   Keep entries concise: no raw tool transcripts, secrets or separate log files.
   For resumed work, read previous entries but verify current code before relying
   on recorded completion; append a new entry rather than overwrite history.
   If the plan exists only in chat, or its file cannot be updated within permitted
   boundaries, include the same record in the final response and explain why it
   was not saved. Do not create a duplicate plan just for logging. Verify saved
   status and entry by reading them back; report any save failure honestly.
9. After the checks in step 7 and before the final response, bring the documentation
   back in line with the code, but only where this run made it inaccurate. The
   coordinator owns the plan document and the records under `docs/`, so no worker
   writes them and the coordinator and a worker never write the same file. Update a
   design record under `docs/` only where an intentional harness decision changed,
   which is exactly what the review checklist in `docs/HARNESS-DESIGN.md` (item 9)
   already requires; update a tracked-path or command list in `README.md` or
   `HANDOVER.md` only where this change made that list wrong. Do not create new
   documentation files, do not create log files, and do not rewrite the original
   diagnosis to match the fix. Do not add documentation work to a worker's brief
   unless that worker owns a document the change invalidates.
   For each document you update, add a dated record in that same document, following
   the convention already used in `docs/HARNESS-DESIGN.md`: a `## <change> record`
   section heading with `**Applied:** YYYY-MM-DD HH:MM:SS +HH:MM` on the next line.
   Read the real system clock at the moment of writing that line; never invent,
   estimate or backdate it. The timestamp is when the change was applied, not the
   plan's creation time and not the Git commit date. If the clock is unavailable, say
   so in the record rather than guessing.
   Record these documentation updates in the same dated Implementation record as the
   code changes from step 8 — re-read the plan and extend that entry — so the
   documentation and the code change cannot be reported separately. If a plan cannot
   be updated, list the documentation changes in the final response instead.
10. Finish with a short summary grouped by source plan: changes, verification results,
   blocked/skipped tasks and remaining issues. Combined checks must cover interaction
   between the implemented areas, not just each area separately. Distinguish completed
   work from blocked scope; never call the whole plan complete while required tasks
   remain blocked. State the exact paths of plan documents updated with records.
   End with a prominent Your decisions section containing ONLY new or unresolved
   choices, or say Your decisions: none. Do not wait until after implementing an
   affected feature to ask how it should behave; leave that work paused beforehand.
   For EACH question, use short labelled blocks in very simple everyday English,
   understandable without opening code or the plan (a saved plan may hold a fuller
   long-form version of the same question; these are the chat form):
   - Question: stable ID and what the user is actually choosing. Give new questions
     unused IDs, preserving existing IDs and option meanings.
   - What happens now: verified current behaviour, why the choice matters and a
     brief evidence reference. Clearly identify anything not yet verified.
   - Options: preserve existing labels; use A/B/C for unlabelled options. Write all
     option detail as prose paragraphs inside this single block: what the
     player/user would notice, a concrete worked example for each option, then its
     meaningful benefits, drawbacks and consequences for extra work, saved progress,
     compatibility, security or later changes where relevant. Do not invent time
     estimates. Explain unavoidable technical terms immediately; omit irrelevant
     internals, not facts that could change the choice. Allow an answer in the
     user's own words.
   - Recommendation: an option and reasons, plus important uncertainties or missing
     evidence that could change the recommendation.
   Keep if-unanswered outcomes (unchanged behaviour, paused tasks and dependants,
   independent work) in the saved implementation record, not the chat questions.
   Do not print If unanswered, How to answer, combined reply examples or repeated
   approval/workflow reminders. Honour those boundaries internally.
   Keep explanations complete enough to choose; do not replace them with bare IDs
   or a link to the document. Keep question IDs and option labels visible, and still
   report actual blocked/skipped work in the results summary. Record answers in the
   same plan, not separate files.

Answer follow-ups: if the user only answers outstanding questions, record clear
explicit answers in a dated Decision record in the same plan before further work.
Use actual date/time with UTC offset, question IDs, options/custom rules, answer
source and affected tasks. Preserve history; re-read before editing and read back
the saved entry. Clarify only ambiguous/conflicting answers. Do not mark answered
tasks implemented or resume coding without an explicit implementation request.
After saving, say 'Updated: <actual document path>' and briefly confirm the choices.
Show remaining open decisions without workflow boilerplate, then end with ONE
copyable fenced text block containing /implement-fast and the actual plan path(s),
quoting paths containing spaces. Never leave placeholders. If saving is blocked
or the plan is chat-only, say it was not saved and why; do not claim an update or
imply that the command will read unsaved answers.
