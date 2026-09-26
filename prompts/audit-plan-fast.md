---
description: Audit, find bugs and produce one implementation-ready plan without changing code
argument-hint: "[area, request or document to investigate; optional output path]"
---
Audit and plan for: $ARGUMENTS

Goal: quickly produce one evidence-based, prioritised implementation plan for a
separate implementation AI. Include bugs, risks, relevant design issues, thoughts
and trade-offs. Do not implement fixes or change project code/configuration.
Only write the combined findings-and-plan Markdown document requested below.
Follow project instructions and preserve unrelated work. Never print secrets.

Communication: work quietly until the final response. Do not send acknowledgements,
progress updates, interim findings or running commentary. Pass this instruction on
to every scout/reviewer subagent: no commentary, only a concise final
result to the coordinator. Keep worker results and tool calls needed for
coordination and verification; the interface may still show tool activity. Do not
skip evidence checks or reviewer verification to reduce visible output. Collect
questions, corrections and open decisions for the final response rather than
waiting for the user during execution. Never guess approval: leave affected
findings out of core fixes and continue independent work. If no safe work can
proceed, finish with the blocker and the question needed to continue. Required
permission gates still apply.

1. Establish scope from the request or the current conversation. Read a supplied
   document if relevant. If scope is absent, use recent uncommitted changes where
   available; if there is no clear scope, stop with a clarification question
   rather than audit everything blindly.
   Briefly inspect project guidance, working-tree state and relevant entry points.
2. For substantial independent areas, dispatch read-only scout/reviewer
   subagents together using the subagent tasks array. Give each a distinct scope,
   relevant context and concrete questions. Prefer broad parallel coverage: dispatch
   up to 12 useful independent investigations together rather than small serial
   batches. The local tool runs up to 12 at once and accepts up to 64 tasks per call,
   queuing the rest. These are ceilings, not targets; respect the active tool's limits.
   Avoid tiny tasks, duplicate investigations and nested delegation.
   For a small request, investigate directly. Batch independent reads and searches.
   These are prompt-level read-only instructions, not a sandbox: scout/reviewer
   have bash access. Require inspection-only commands; never use shell writes.
   Reduce concurrency if provider throttling or resource exhaustion occurs.
3. Require evidence for findings: file and line or symbol, observed behaviour,
   expected behaviour, practical impact and confidence. Inspect surrounding code.
   Separate confirmed bugs from suspicions needing verification. Do not invent
   findings or treat stylistic preferences as bugs. Review security defensively;
   do not develop exploits or probe external systems.
   Before combining findings, have a separate reviewer re-open every candidate
   finding's cited code and relevant callers. Group checks by area and dispatch
   independent groups in parallel; use one reviewer for a small audit. Confirm the
   target exists, the trigger is reachable and the claimed consequence is supported.
   Record Confirmed / Corrected / Rejected / Unresolved, with evidence and whether
   confirmation is code-inspection-only or backed by execution. Corrected findings
   must be rechecked in their corrected form. Drop rejected findings; unresolved
   claims stay out of core fixes. Do not label code inspection as a passing runtime
   test. Explicit user feature requirements need not be disguised as verified bugs.
4. Use focused, non-destructive local checks where practical. Do not install
   dependencies, modify project files, run mutating tests or access external
   systems without permission. Never claim a check passed unless actually run.
   When execution is unavailable, mark the finding as inspection-only and list
   the verification needed. Keep subagent reports concise.
   For Godot, use project checks where available. Bound every headless command with
   a wall-clock timeout (project limit, otherwise 120s per command initially), using
   a tool timeout or process wrapper that terminates the launched process on expiry.
   Report timeout as failure; --quit-after alone is not a wall-clock timeout.
   Where supported and read-only in this environment, use --headless --path <project>
   --check-only --script <script> for relevant scripts before runtime smoke checks.
   If required imports/cache updates would violate read-only scope, do not run them;
   report that prerequisite as blocked. Parse checks do not prove runtime behaviour.
5. Combine findings, remove duplicates and reconcile cross-area dependencies into
   ONE plan. Beyond the targeted finding verification, no full re-audit or separate
   planning-agent pass by default. Explain
   important trade-offs plainly; separate necessary fixes from optional improvements.
   Resolve factual unknowns through focused code inspection/checks before asking
   the user. Distinguish observed behaviour from intended behaviour: existing code
   alone does not establish the user's desired design. Never present a guess as fact.
   Flag genuinely ambiguous decisions requiring approval rather than assuming them.
   Do not interrupt for routine implementation details that follow existing patterns
   within approved scope and do not alter intended gameplay, public interfaces,
   saved data or security. Reversibility alone does not make a design choice safe.
   Do not propose building two systems to avoid a decision. A small toggle/setting
   is appropriate only when explicitly approved or following an existing config
   pattern within approved scope, preserving the current default and with clear
   checks for supported options; it does not authorise an otherwise optional feature.
   Rank the combined findings and the resulting tasks best-to-worst using the
   criteria in step 6, and use that same order in the chat summary.
6. Save the combined document to the user's requested Markdown path, otherwise
   docs/plans/<short-topic>-plan.md (choose a descriptive topic), creating the
   docs/plans/ folder if it does not exist. Do not overwrite an
   unrelated existing document; choose an unused suffix or ask if ambiguous.
   Include:
   - A compact header: Created (date, time and explicit UTC offset), Plan status
     (Ready for implementation / Needs decisions), and Implementation status
     (Not started). Read the actual system clock; never invent a timestamp.
     Record the inspected Git HEAD commit and whether uncommitted changes were
     present before writing this document. A commit alone does not identify those
     changes. If the clock or Git information is unavailable, say so; do not guess.
   - Scope, goal, relevant project state and constraints.
   - Prioritised findings, ordered best-to-worst: evidence, impact, confidence
     and check status. Order them by these criteria, highest band first:
       1. Must fix: anything affecting security, data loss, correctness, or a
          broken non-negotiable rule the project depends on.
       2. Best value to the user, among everything left.
       3. Least effort, among everything still left.
     When two findings sit in the same band, use the next criterion to break the
     tie. Give every finding its band and a one-line reason.
   - Thoughts, trade-offs, optional improvements and open decisions.
   - Implementation tasks with IDs, concrete changes, owned files, shared interface
     expectations, dependencies and acceptance checks. Each task carries the
     explicit rank or band of its finding (must-fix / best-value / least-effort)
     so a separate implementer neither re-weighs nor re-orders the work. Include
     enough context for
     isolated workers, but require them to verify code assumptions before editing.
   - Parallel execution batches: prerequisites first, then independent tasks. A
     prerequisite always overrides rank: a lower-ranked task that another task
     needs runs first, whatever band it carries. Allow one
     writer per file in each batch, including scenes/resources/generated output.
     Different files can still depend on each other: state those dependencies.
   - Final combined verification steps, in dependency order, with commands where
     known. Mark unavailable checks and remaining uncertainties honestly.
   - A clear boundary between proposed core work and optional/unapproved work.
     Tell the implementer to leave optional items out unless explicitly approved,
     and pause affected tasks for unresolved decisions.
   - Keep this document as the single record: no separate log files. Give the
     document this fixed tail layout, defined here once at plan creation and
     followed by every later appender: plan body, then `## Your decisions`
     (with its `### Answered decisions` subsection), then `## Decision records`,
     then `## Implementation record`. Create `## Decision records` and
     `## Implementation record` now as empty placeholders, so later appenders
     have a real heading to write under. Records are `##`-level siblings of the
     plan body, never nested, so a `###` or bold record can never land inside a
     `#### Option A` block.
     Tell the implementer to preserve the original findings, tasks, creation
     metadata and questions, update only the Implementation status in the header,
     and append a short dated entry under `## Implementation record` when a run
     ends. Later runs append entries rather than replace history, including partial
     or blocked outcomes. Do not rewrite the original diagnosis to match the fix.
   - After the plan body, the `## Your decisions` (Questions and
     unanswered-decision policy) section, in the fixed tail layout above.
     Ask only choices inspection cannot resolve.
     Check available explicit user answers first; do not ask answered questions again.
     Preserve existing question IDs, option labels and meanings; give new questions unused
     IDs. Qualify IDs by plan name when multiple plans use the same ID.
     The saved plan's decision explanations are a main deliverable, not a brief
     closing checklist. In the saved plan, prioritise comprehension and
     completeness over brevity, even when the findings summary is short; the chat
     carries the same facts in the shorter form given below. Include every known
     fact, consequence and uncertainty
     that could reasonably change the choice. Do not claim to know everything:
     identify missing evidence plainly. Do not make the user read code, follow a
     reference or open another document to understand what they are approving.
     Use very simple everyday English and Australian spelling. Explain unfamiliar
     terms immediately with a practical example; do not use task IDs as explanations.

     REQUIRED LAYOUT in the SAVED PLAN:
     One question has two forms. The saved plan uses the long form below, with a
     labelled block for every fact. The final chat uses the short chat layout
     that follows it: the same questions, the same option labels, the same facts,
     far fewer blocks. The two forms differ in shape, never in content. Never drop
     a fact that could change the answer just to shorten one of them.
     - Start the decision section with ## Your decisions and the number of open
       questions. If none remain, say 'No decisions need your answer' under that
       heading and omit option blocks. Present prerequisites
       before choices that depend on them. Explain conditional options clearly.
     - Give EACH question its own ### Q1 — <plain-English question> heading, using
       its actual stable ID. Put a blank line between blocks and a horizontal rule
       between questions. Do not use tables, dense nested lists, or a code block
       around the explanations. Use short paragraphs and single-level bullets.
     - Under **What you are deciding**, explain the choice, why it is being asked
       now, and what part of the project it affects. One question should represent
       one meaningful choice; do not bundle unrelated approvals together.
     - Under **What happens now**, explain verified current behaviour in ordinary
       words, with a concrete example. Explain the problem or reason for considering
       a change and who would notice it. Distinguish current behaviour, proposed
       behaviour and assumptions. Put brief evidence references after the explanation,
       not in place of it. In this same block, say what is still unverified: the
       important facts you could not confirm and how each could change the choice,
       or that no material uncertainty was found in the checks performed. Separate
       a lack of evidence from a design preference, and say what was checked
       rather than invent a before/after story for behaviour you could not verify.
       Do not invent costs, timings, guarantees or findings.
     - Give EVERY option its own #### Option A — <descriptive name> heading.
       Preserve existing labels and meanings; assign A/B/C to unlabelled options.
       Never squeeze several options onto one line or describe an option only as
       'recommended', 'simpler', 'safe' or 'keep existing'. Under EACH option use
       these separate bold labels with plain explanations:
       **What would happen:** what actually gets built or stays unchanged, what
       the player/user experiences and the boundaries of this choice.
       **Example:** a worked scenario, using real numbers where helpful. Compare
       all the options against the same starting situation, so their difference is
       obvious. Mark illustrative numbers as examples, not measured project facts.
       **Benefits:** what improves and for whom, or what existing benefit is kept.
       **Downsides and consequences:** what is lost, restricted or made harder;
       relevant effects on gameplay, existing users, saved progress, compatibility,
       security, extra implementation work and future maintenance. Explain whether
       changing the decision later would require rework or could lose data, where
       relevant. If a material effect is unknown, say so; do not fill the section
       with unrelated caveats.
     - Under **My recommendation and why**, name an option, explain why it best fits
       the user's stated goals, and acknowledge its main trade-off. Explain when a
       different option would be better. If evidence does not support a recommendation,
       say what information is missing instead of giving false confidence.
     - In the SAVED PLAN ONLY, record the if-unanswered outcome: what stays
       unchanged, which tasks and dependants pause, and what can continue.
       Omit this block from chat. Do not print How to answer, combined reply examples,
       plan-qualified reply syntax or repeated approval/workflow reminders. The user
       already knows the process. Keep stable question IDs and option labels visible.
     Before saving, check every open question against this layout:
     can the user explain each option's practical result and main trade-off without
     looking elsewhere? Also check the saved plan's unanswered outcomes. Fill missing decision-relevant
     information or flag it as unknown. In the saved plan, do not cut these
     explanations just to keep it short; remove repetition and irrelevant internals
     instead.

     REQUIRED LAYOUT in the FINAL CHAT — the same questions in four short blocks:
     - Start the section with ## Your decisions and the number of open questions,
       then give each question its own `### Q1 — <plain-English question>` heading
       using its actual stable ID. Keep the option labels and their order the same
       as the plan. Omit the plan's if-unanswered outcome and its
       `### Answered decisions` subsection; those belong in the saved plan only.
     - **Question:** the stable ID and, in a sentence or two, what the user is
       actually choosing.
     - **What happens now:** the verified current behaviour and why the choice
       matters, with a brief evidence reference, plus what is still unverified.
     - **Options:** write every option as a short prose paragraph inside this one
       block, covering what the user would notice, a worked example, its benefits,
       and its drawbacks or consequences. Keep every fact that could change the
       answer; leave out only repetition and irrelevant internals.
     - **Recommendation:** an option and why, plus the uncertainties that could
       change it.
     The chat must still let the user answer without opening the plan.

     Default: preserve existing behaviour, block only affected tasks and dependants,
     and continue independent work. Recommendations, silence and a generic instruction
     to implement are not approvals. In the saved plan only, list already answered
     choices under Answered decisions within this section, with their explicit user
     source; omit that subsection from the final chat. Do not list
     them as open or infer answers from code. Later /decisions runs append dated
     entries under `## Decision records` without rewriting the original plan.
     Plan status describes the original audit; later records establish current
     decision state, so do not rely on the original header alone.
7. Stop after writing the document. In chat, FIRST state the exact document file
   name and full path clearly on its own line, for example:
   "Plan written to: docs/plans/<short-topic>-plan.md"
   so the user always knows exactly which document was created. Then summarise the
   most important findings and decisions briefly, in the same best-to-worst order
   as the plan's Prioritised findings and Implementation tasks.
   Keep approval boundaries in the plan; do not repeat them as chat boilerplate.
   The response ends with exactly one fenced text block (```text) containing the
   next command `/implement-fast` followed by the ACTUAL plan path just written, so
   the command is the last thing on screen and is copyable with one click. Quote
   any path containing spaces. Never leave a placeholder such as <document-path> in
   that command. The Your decisions section therefore comes immediately before the
   command block, and nothing follows the block.
   This is the single rule for the command block: apply it to the run that writes
   the plan and to every later answer-follow-up response. Do not restate the block
   anywhere else.
   End with a prominent Your decisions section containing ONLY open questions, in
   the short CHAT LAYOUT below.
   The request for a brief findings summary does NOT shorten the decision content:
   use the short chat layout, not the plan's long form.
   If no questions remain, use the no-decisions
   form above. Do not start implementation automatically.

Answer follow-ups: when the user replies to these questions, append clear explicit
answers as a dated Decision record in the same plan (actual date/time with UTC
offset, question IDs, selected options/custom rules, answer source and affected
tasks). Preserve original questions and previous records; later changed answers
supersede earlier ones rather than overwrite them. Re-read before editing and read
back the saved entry. Ask only about ambiguous/conflicting answers; do not repeat
resolved questions or mark answered tasks implemented. Do not create separate files.
After saving, say 'Updated: <actual document path>' and briefly confirm the choices.
Show any remaining open decisions without workflow boilerplate, then close the
response exactly as step 7 does: the decisions first, then the one copyable fenced
text block with the next command. Follow that step 7 rule rather than restating
the command rules here.
If saving is blocked or the plan exists only in chat, say the answers were not saved
and why; never claim an update or imply the command will read unsaved answers.
Do not begin implementation merely because a question was answered.
