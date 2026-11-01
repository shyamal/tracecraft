---
name: tc-implement
description: Implement a selected Tracecraft task from its requirements and architecture, with scoped code changes, regression tests and an implementation handoff. Use when the user asks to code a planned feature or fix.
---

# Implement a planned task

Read [contract v1](../references/contract.md) and [execution/evidence guidance](../references/execution.md). Use the [implementation note template](assets/implementation.md) for the selected task.

1. Identify the requested task and its requirements, acceptance criteria, active decisions and prerequisites. If no task was named, choose the first unblocked task only when that choice follows the user's requested scope; otherwise clarify the target. Read current code/tests and working-tree changes. Passing `check --stage plan` is structural evidence, not authorization or proof that prerequisite code exists.
2. State a short implementation approach consistent with the plan. If evidence shows the design or requirement needs a material change, explain the conflict and route that choice back to specification/architecture. Do not silently change expected behavior to fit convenient code. Continue independent portions that do not depend on the unresolved choice.
3. Make the smallest coherent production change and behavior-focused tests for the selected outcome. For a reproducible bug, add or identify a failing regression before the repair when practical, and distinguish an observed failure from a merely predicted one. Reuse repository conventions; avoid unrelated cleanup and speculative infrastructure.
4. Run relevant local checks within existing authority. Inspect failures, fix defects within the selected task and rerun affected checks. Preserve unrelated pre-existing failures as separately reported findings. Never manufacture green results by weakening the test or its environment assumptions.
5. Inspect the final diff and write/update `implementation/<TASK-ID>.md`: changed behavior, linked requirements/tests, observed checks, deviations, blockers and remaining verification. Claims must describe final inputs; earlier successful runs do not cover later edits. Hand off to `tc-test` for broader criterion coverage, or to review if that coverage has already been established and the user requested it.

Keep implementation and testing distinct from approval, commit, push, merge and deployment. Those require their own scope/authorization; using this skill alone does not authorize them. Do not mark every task complete because one selected task passed its checks.
