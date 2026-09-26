---
description: Cost-conscious implementation of an existing plan
argument-hint: "<plan document path>"
---
Implement the existing plan supplied here: $ARGUMENTS

Use a token-conscious workflow. Follow project instructions, preserve unrelated
changes and never print secrets.

1. Read every explicitly supplied plan document completely. If no path is supplied,
   use only a plan clearly identified in the current conversation; otherwise ask for
   the path instead of searching the repository and guessing.
2. Check Git status and inspect enough current code to confirm the plan's assumptions.
   Do not repeat the full audit. If the code materially contradicts the plan, pause
   the affected task, explain the evidence and continue independent safe work.
3. Read all recorded user decisions. Implement required and explicitly approved work
   only. Leave optional work and unresolved choices unchanged. Do not infer approval
   from silence or from a recommendation in the plan.
4. Work directly by default. Use one worker only for a substantial, self-contained
   task that benefits from isolated context. Do not launch parallel workers unless
   the user explicitly asks to trade extra tokens for speed.
5. Keep one writer per file. Preserve unrelated work. Make the smallest coherent
   changes that fix the root cause.
6. Run the most relevant targeted checks, then a combined check when interactions
   warrant one. A check proves only what it exercises. Report exact commands,
   failures, timeouts and checks that could not be run; never claim success from
   inspection alone.
7. Re-read changed files and the plan. Update only its Implementation status and
   append a short dated Implementation record containing completed/blocked tasks,
   changed files, checks and remaining decisions. Preserve the original findings and
   decision history.
8. Finish with a concise summary: changes, checks, blocked or skipped work, plan path
   updated and any decisions still needed.
