---
name: tc-specify
description: Turn a feature idea, issue or change request into a Tracecraft requirement contract with testable acceptance criteria. Use before architecture or task planning, or when requirements change.
---

# Specify a feature

Read [the contract and handoff rules](../references/contract.md) before writing artifacts. Use [the brief template](assets/brief.md) for rationale and context outside the selected contract version.

1. Identify the selected project, feature and desired outcome. Read relevant existing behavior, interfaces and tests before describing what must change. On a greenfield project, label proposed behavior rather than inventing current behavior or paths.
2. Separate requested behavior from assumptions. Capture actors, in/out of scope, constraints and important failure/boundary conditions. Include measurable nonfunctional requirements only when supported by the request or project evidence; do not invent latency or scale targets.
3. Write stable `REQ-*` nodes with outcome-oriented statements and observable acceptance criteria. For new v2 features, give criteria stable AC IDs, record requirement sources and list assumptions explicitly. Preserve existing v1 format unless migrating deliberately. Include authorization, invalid-input or retry cases when the feature exposes those behaviors. Avoid implementation prescriptions unless they are actual constraints. A small bug fix can have one requirement.
4. Create or update `feature.json` and `brief.md`. New contracts start with empty decisions/tasks/tests arrays. Put sources, assumptions, open questions and proposed defaults in the brief, keyed to requirement IDs. If an unanswered question changes acceptance, mark the affected requirement provisional and the handoff blocked; do not choose a business policy silently.
5. Run `check <feature.json> --stage specify`. Review criteria for ambiguity beyond what the checker can detect. Report the handoff to `tc-architect`, including questions that remain open. Do not create architecture or code simply to fill later-stage arrays.

For changed requirements, preserve IDs for the same intent, explain the before/after behavior and list downstream nodes that need review. The impact command can help only when the full contract passes default validation; otherwise inspect explicit references without claiming complete impact coverage.
