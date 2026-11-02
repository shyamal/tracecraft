---
name: tc-test
description: Verify a Tracecraft feature or selected tasks against acceptance criteria using project-native tests, recording observed outcomes and coverage gaps. Use for testing implemented changes, not for treating test plans as executed evidence.
---

# Verify behavior against the contract

Read [feature contracts](../references/contract.md), [execution/evidence guidance](../references/execution.md), the selected feature's implementation notes and current code/tests. Use the [verification report template](assets/verification.md).

1. Confirm the requested feature/task scope and current input state. Run the plan-stage structural check if available. Build a criterion-to-test matrix from the contract and plan; inspect existing assertions rather than inferring coverage from filenames or test names. If implementation is absent, mark affected checks blocked instead of inventing a result.
2. Select the smallest useful mix of regression, unit, integration and manual checks based on the changed behavior and risks. Add or improve test files within the testing request when necessary to observe an acceptance criterion. Do not edit production code during a test-only request. Report genuine product failures back to `tc-implement`; if the user already authorized a fix-and-test workflow, clearly separate repair from verification and recheck after the repair.
3. Inspect and run the project's applicable commands within the existing permission boundary. Use real completion signals, exit status and assertion/manual evidence. Distinguish infrastructure failures, zero-test successes, skips and timeouts from behavior passes. Do not retry indefinitely or weaken tests to hide failures.
4. Map each scoped criterion to the observed outcome: passed, failed, blocked, not-run or inconclusive. Include positive and relevant negative/boundary cases. A pass for one test does not qualify all criteria. If tests or source changed after a run, rerun affected checks before reporting current evidence.
5. Create a new `verification/<run-id>.md` with commands, input-state limits, sanitized evidence, coverage and remaining risks. Explicitly label it agent-authored observational evidence. Report the result and next action; failing behavior returns to implementation, unresolved requirements return to specification, and established coverage can proceed to review.

Use the implemented verify/status/evidence/readiness commands only within their documented scope. Receipts are unsigned; freshness checks cover selected inputs and readiness checks declared policy. Do not infer authenticated execution, adequate assertion coverage, merge approval or release authorization from their output. Preserve previous reports and unrelated code, tests and CI configuration.
