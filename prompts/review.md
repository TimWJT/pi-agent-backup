---
description: Audit code for bugs, design flaws and architecture problems
argument-hint: "[files or area to review]"
---
Audit the following code: $ARGUMENTS (if empty, audit recent uncommitted changes — use `git diff` and `git status` to find them).

Work in this order:

1. **Correctness first** — real bugs, edge cases, race conditions, wrong assumptions.
2. **Safety** — anything that could corrupt data, leak secrets, or break the project's
   non-negotiable rules from AGENTS.md / CLAUDE.md.
3. **Design** — coupling, duplication, missing abstractions. Prefer modular,
   config-driven fixes over clever ones.
4. **Smells** — naming, dead code, inconsistency with existing conventions.

Rules:

- Read the surrounding code before judging; don't review a function in isolation.
- For every finding give: file + line, the problem in plain English, why it matters
  with a concrete example (real numbers where possible), and a suggested fix.
- Rank findings: 🔴 must fix, 🟡 should fix, 🟢 nice to have.
- If something is fine, say so briefly — don't invent problems to seem thorough.
- Finish with a one-paragraph plain-English summary Tim can act on.
