---
description: Cost-conscious audit that writes an implementation-ready plan
argument-hint: "<area or request> [optional output path]"
---
Audit and plan for: $ARGUMENTS

Do not implement or change project code/configuration. Produce one evidence-based,
implementation-ready Markdown plan. Follow project instructions, preserve unrelated
work and never print secrets.

Use a token-conscious workflow:
1. Establish the exact scope from the request and current conversation. If it is
   genuinely unclear, ask one focused clarification question instead of auditing the
   whole project.
2. Read project guidance, Git status and only the relevant code and tests. Work
   directly by default. Use one well-scoped scout only when broad discovery would
   materially reduce main-context noise. Do not launch parallel workers unless the
   user explicitly asks to trade extra tokens for speed.
3. For each finding, record the file and symbol or line, observed behaviour, expected
   behaviour, impact and confidence. Separate confirmed bugs from suspicions. Use
   focused non-destructive checks where practical; never describe code inspection as
   a passing runtime test.
4. Resolve factual questions by inspecting code. Ask the user only about intended
   behaviour or meaningful trade-offs that evidence cannot decide. Preserve current
   behaviour when approval is missing, and mark only affected work as blocked.
5. Write one plan to an explicitly requested path, otherwise
   `docs/plans/<short-topic>-plan.md`, creating the folder if needed. Do not
   overwrite an unrelated document. Include:
   - scope, goal, constraints and relevant project state
   - prioritised findings with evidence and check status
   - numbered implementation tasks with owned files and dependencies
   - acceptance checks and final verification commands where known
   - optional work clearly separated from required work
   - open decisions with plain-English options, consequences and a recommendation
   - Implementation status: Not started
6. Read the saved plan back. In the final response, state its exact path, summarise
   the important findings and decisions, and give the exact next command:
   `/implement <plan-path>`.

Keep the plan concise enough to use, but detailed enough that implementation does
not need to repeat the audit.
