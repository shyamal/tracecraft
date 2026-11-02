# Implementation plan

TASK-001 changes bin/tracecraft.mjs and adds test/help.test.mjs. First record the failing alias assertion, then implement the dispatch branch and shared command list.

TEST-001 maps AC-001 to equivalent alias output plus required command names, AC-002 to invalid extra/unknown command exits, and AC-003 to running from a fresh directory and comparing entries before/after. Proposed focused command: node --test test/help.test.mjs. Broader regression: node --test. Run these only during implementation/verification.
