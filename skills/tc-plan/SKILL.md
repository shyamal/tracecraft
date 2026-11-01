---
name: tc-plan
description: Convert a Tracecraft requirement contract and architecture into dependency-ordered implementation tasks and planned test cases. Use when preparing a feature for coding, not for executing the plan.
---

# Plan implementation and verification

Read [the contract and handoff rules](../references/contract.md), the selected contract, brief, architecture and referenced active decision notes. Use [the plan template](assets/plan.md).

1. Run `check <feature.json> --stage architect`. Review unresolved questions and decision status. Missing design or unresolved choices that change implementation block a ready handoff, even if structural coverage passes. Continue planning independent areas and name the blocked tasks.
2. Inspect the repository's existing build/test conventions and likely change locations. Distinguish existing paths from proposed ones. Split work into small reviewable outcomes, preferably vertical slices, without manufacturing generic setup/refactoring tasks.
3. Add stable `TASK-*` nodes with requirement IDs and explicit prerequisites. Name the relevant decision in `dependsOn`; add task-to-task ordering only where there is an actual dependency. In `plan.md`, record each task's change areas, behavior, done condition and verification approach. Preserve existing tasks on reruns and reconcile changed dependencies.
4. Add `TEST-*` specifications linked to requirements and implementation tasks. In the plan, map **every acceptance criterion** to a proposed test case and testing level. Include negative/boundary/regression cases justified by the requirements. Existing tests may be reused after inspecting what they assert. Proposed commands must be identified from the project or labelled proposed; do not execute them during planning or call them passing.
5. Run `check <feature.json> --stage plan`. Verify a feasible dependency order and semantic criterion coverage manually. Report the first ready implementation task, blockers and remaining design risks. Planning completion means a coherent plan, not implemented or tested software.

For non-executable criteria, describe a concrete manual review/check and its evidence in the test specification. Never invent automated coverage just to satisfy graph rules. For implementation choices still proposed, state the assumption clearly; defer affected execution until the choice is resolved by the user or established project conventions.
