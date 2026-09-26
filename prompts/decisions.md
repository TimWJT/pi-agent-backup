---
description: Explain only the project's open decisions in plain English without implementing anything
argument-hint: "[plan paths or question IDs; otherwise use the current plan]"
---
Help me resolve project decisions: $ARGUMENTS

Work quietly until the final response. No progress chatter. Follow project guidance,
preserve unrelated work and never print secrets. This is decision catch-up, not an
audit or implementation run. Do not change project code/configuration, run mutating
tests, install dependencies or access external systems. Do not implement a choice.

1. Read all explicitly supplied plan documents, including their questions and later
   implementation/decision records. Otherwise use the clearly identified plans in
   this conversation; if none are clear, briefly check docs/plans/ first, then the
   rest of docs/, then PLAN.md and handover notes. If the source is still ambiguous,
   finish with a simple clarification question rather than guessing or scanning
   unrelated projects/session histories.
   Read available explicit user answers. If specific question IDs were requested,
   focus on those and any decisions needed to answer them.
2. Reconcile questions with answers and records. Preserve original question IDs and
   option meanings; qualify IDs by plan name when multiple plans reuse an ID. Do not
   ask answered questions again. Recommendations, silence, generic implementation
   approval and existing code are NOT answers. If answers conflict, lack a clear
   source or cannot be mapped confidently to an option, explain that uncertainty
   and ask only the clarification needed. An answered-but-unimplemented choice is
   remaining work, not an open question. Inspect relevant local code read-only when
   needed to confirm current behaviour; do not repeat a full audit. Clearly label
   facts you could not verify. Never treat old plan text as proof of current code.
3. Finish with a prominent Your decisions heading and only the open questions (or
   say Your decisions: none). State the source plan paths. For EACH open question,
   use short labelled blocks in very simple everyday English, understandable without
   reading code or opening another document (a saved plan may hold a fuller long-form
   version of the same question; these are the chat form):
   - Question: stable ID and the actual choice, not an implementation label.
   - What happens now: verified behaviour, why the decision matters and a brief
     evidence reference. Separate what is known from assumptions.
   - Options: preserve existing labels, or use A/B/C for previously unlabelled
     options. Write all option detail as prose paragraphs inside this single block:
     what the player/user would notice, a concrete worked example for each option,
     then its meaningful benefits, drawbacks and consequences for extra work, saved
     progress, compatibility, security or later changes where relevant. Do not invent
     time estimates. Explain unavoidable technical terms immediately. Keep every fact
     that could change the user's choice; leave out irrelevant internals. Allow a
     different rule in their own words.
   - Recommendation: an option and why, with important uncertainties or missing
     evidence that might change it.
   Do not print If unanswered, How to answer, combined reply examples or repeated
   approval/workflow reminders. Keep unanswered-task rules in the saved plan and
   honour them internally; the user already knows the process. Keep question IDs
   and option labels visible, and retain all substantive option consequences.
   Do not invent questions to fill this format. If a requested question is already
   answered, briefly state its answer and source instead of asking it again.
4. When explicit answers are supplied now or in follow-up replies, record clear
   answers directly; ask for clarification only for ambiguous/conflicting answers.
   Append a concise dated Decision record under the `## Decision records` heading of
   the same source plan, if permitted. That heading is a `##`-level section after
   `### Answered decisions`; if it is somehow missing, create it in that position.
   Preserve `### Answered decisions` and all prior records, and keep records as
   `##`-level siblings, so they can never nest inside a `#### Option A` block.
   Include actual system date/time with UTC offset, question ID, chosen
   option or custom rule, user-answer source and affected tasks. Keep the original
   questions, options, creation metadata and previous records intact. Read the file
   before editing and read back the saved entry. Do not duplicate an already recorded
   answer; append later changes as superseding the earlier answer with its source.
   Never backdate an answer or invent a timestamp. Mark unavailable time information.
   This command permits only those answer-record edits, not rewriting the plan or
   updating header statuses. The original Plan status is historical: derive current
   open decisions from the original questions plus later records, not that header
   alone. Do not mark answered tasks as implemented.
   If the plan is chat-only, read-only, ambiguous or being edited by another owner,
   report the answer in chat and explain why it was not saved; do not create separate
   question files or duplicate plans. Without new explicit answers, remain read-only.
   After saving, say 'Updated: <actual document path>' and briefly confirm the
   choices. Show any questions still open without workflow boilerplate. End with
   ONE copyable fenced text block containing /implement-fast and the actual plan
   path(s), quoting each path containing spaces; never use a placeholder. If saving
   failed, do not claim an update or imply the command will read unsaved answers.
   Resolving a choice is not permission to start coding; never run it automatically.
