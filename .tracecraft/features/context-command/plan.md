# Context implementation and test plan

Feature ID: context-command
Status: ready for implementation

## Task order
TASK-001: add src/context.mjs (new), reuse src/contract.mjs. Done when supported stages select known sections/files, preserve hashes and handle omissions within the output bound.
TASK-002 after TASK-001: extend bin/tracecraft.mjs and docs. Done when explicit context invocation works without changing existing commands or input files.

## Acceptance-to-test matrix
REQ-001 criteria 1–2 → TEST-001: stage/precedence and repeated byte-identical serialization tests.
REQ-002 criteria 1 and 3 → TEST-001: source SHA-256 and omitted-group assertions; no execution state in projection.
REQ-002 criterion 2 → TEST-002: missing, unreadable and oversized companion records.
REQ-003 criteria 1–3 → TEST-002: total UTF-8 limit, Unicode, required packet overflow, oversized/invalid contract, unknown fields and external symlink isolation.
REQ-004 criteria 1–3 → TEST-003: CLI in temporary features; input bytes preserved, exit codes/options checked; existing tests remain green.

All tests are planned at this handoff, not reported as already run.

## Validation commands
Existing: node --test (package.json) for the toolkit suite.
Proposed: node bin/tracecraft.mjs context .tracecraft/features/context-command/feature.json --stage implement for the end-to-end demo.
Structural handoff: node bin/tracecraft.mjs check .tracecraft/features/context-command/feature.json --stage plan.

## Handoff
No blocking questions. First ready task: TASK-001. Source hashes are provenance only, not a transactional snapshot or a trusted attestation. Complete means selected documents were included, not semantic readiness.
