# Review pilot: passing tests miss an expiry regression

Review ID: review-pilot-001
Feature / task: expiry-boundary / TASK-001
Provenance: same-session, author-run synthetic smoke test; not independent model evaluation or a trusted attestation
Outcome: changes-requested
Coverage: complete for the selected pure-function diff and three numeric criteria

## Reviewed inputs and scope

Date: 1 November 2026. Host: this Codex desktop session. Node.js 26.5.0. Model/version not independently recorded. A disposable scratch fixture compared `base/expiry.mjs` with `current/expiry.mjs`, and inspected `current/expiry.test.mjs`. The reused pilot contract and plan define REQ-001/TEST-001: accept before expiry, reject at equality, reject after expiry. The plan-stage structural check passed.

Observed SHA-256 values, identical before and after review:

- Base source: `8578c68833ef7a497e79e03be3b35df25af4c69b301b115c32d5c7447bcbe48a`
- Current source: `07014ff68d27d78b2fc64d99de5f82cfb07f5c773c90fd23f243c685dc77f707`
- Current tests: `6cb22a47d52ad6014ee9fb8405df56479a18aeccee42e6c9558b38d5fcb7ee9a`

No Git revisions were used for the fixture; explicit file comparison and actual digests bind the inspected files. Scope excludes storage, authorization, input validation and live-clock behavior.

## Finding R-001 — P2: reject acceptance at the expiration boundary

- Location: `current/expiry.mjs`, line 2, at the current-source digest above.
- Trigger: `canAccept(1000, 1000)`.
- Effect: changing `<` to `<=` returns true at expiry, violating REQ-001 criterion 2. This is introduced by the selected diff; the baseline returns false.
- Evidence: a direct Node assertion expecting false exited 0 for the baseline and 1 for the changed source (`true !== false`). The existing two-test suite passed because its assertions cover only before/after, not equality.
- Links: REQ-001 criterion 2; ADR-001's exclusive upper-bound decision; TEST-001.
- Repair direction: restore an exclusive comparison and add an equality regression, then reverify the updated input.
- Disposition: open. No repair was applied during review.

## Evidence and coverage

The reviewer ran `node --test current/expiry.test.mjs` from the pilot root: exit 0, two passed, no failed/skipped tests. Separate `node --input-type=module -e ...` assertions imported each source and asserted equality rejection: baseline exit 0, current exit 1. They did not write source or test files.

| Criterion | Code/assertion inspected | Observation |
|---|---|---|
| REQ-001 criterion 1 | canAccept(1000, 999) equals true | Existing test passed |
| REQ-001 criterion 2 | canAccept(1000, 1000) must equal false | Reviewer reproduction failed on current source |
| REQ-001 criterion 3 | canAccept(1000, 1001) equals false | Existing test passed |

## Next action and limits

Hand R-001 to implementation; add the missing regression and rerun tests, then re-review the updated files. No release approval or external posting follows from this report. This deliberately seeded pilot demonstrates the report/evidence flow only. It does not measure independent defect detection, false positives, broader scenario coverage or improvement over a no-skill baseline.
