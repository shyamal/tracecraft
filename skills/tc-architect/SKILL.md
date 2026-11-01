---
name: tc-architect
description: Design technical architecture for a Tracecraft feature contract, linking requirements to decisions, interfaces and failure behavior. Use after specification or when a design must be revised.
---

# Design the technical approach

Read [the contract and handoff rules](../references/contract.md), the selected feature contract and brief. Use the [architecture template](assets/architecture.md) and [decision template](assets/decision.md) at the detail level the change warrants.

1. Run the specify-stage check. If the contract is missing, ask for the feature or recommend `tc-specify`; do not invent requirements to make a design look complete. Read open questions and user decisions; resolve architecture-blocking uncertainty before calling the result ready.
2. Inspect relevant modules, interfaces, persistence, tests and deployment constraints. Distinguish reused components from proposed additions. Explain an adequate existing design before proposing new infrastructure.
3. For consequential choices, compare viable options on requirements, complexity, failure modes and reversibility. One option may suffice for a small change reusing an established pattern; explain why. Include data/control flow, interface contracts, authorization/trust boundaries and migration/rollback where relevant. Do not generate irrelevant infrastructure sections just to fill a template.
4. Write `architecture.md`, decision notes under `decisions/ADR-*.md`, and matching entries in `feature.json.decisions`. Every requirement maps to a decision, including an explicit reuse decision when no new architecture is needed. Notes carry alternatives, rationale, consequences and proposed/accepted status; only call a choice accepted when supported by user or existing project authority.
5. Run `check <feature.json> --stage architect`. Check the prose for unsupported claims, missing failure paths and contradictory decisions. Hand off design constraints and unresolved risks to `tc-plan`. No task implementation or product test execution belongs in this step.

When revising architecture, preserve decision history in notes and reconcile active contract links. The contract graph has no superseded status: keep only active decisions in it, preserve superseded notes on disk and explicitly re-link affected tasks/tests. If intent is unclear, mark the handoff blocked instead of silently breaking links or rewriting the user's design.
