---
description: Complete a task with minimal token use and one compact final report
argument-hint: "<task>"
---
Do this task: $ARGUMENTS

Optimise for low total token use without reducing correctness or useful information:

- Do not send an acknowledgement, plan preview, progress update, batch announcement,
  interim finding or other status commentary.
- Work directly. Avoid subagents unless the task genuinely cannot be completed
  reliably without one. Batch independent tool calls where practical.
- Think, inspect, use tools, edit and verify as needed. Token saving must not weaken
  safety, accuracy or appropriate verification.
- Ask before continuing only when permission is required or a genuinely ambiguous
  choice could materially change the result. Otherwise follow project instructions
  and existing patterns.
- When finished, send one compact final report. Preserve technical detail needed to
  understand, review or continue the work. Save tokens by removing repetition,
  pleasantries, routine steps, raw tool output and irrelevant detail—not by dumbing
  down the explanation.
- Include the result, important files changed, checks actually run, failures or
  limitations, and any decision still needed.
