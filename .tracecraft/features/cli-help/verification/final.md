# CLI help verification

Agent-authored observations from a same-assistant run on Tracecraft's real source in an isolated working copy, 2 November 2026, Node 26.5.0/macOS. This is not an independent user pilot.

TEST-001: AC-001 passed via equivalent help/--help/-h JSON and presence of all implemented command names, including help. AC-002 passed via extra-argument and unknown-command exit-2 assertions. AC-003 passed via an empty temporary working directory remaining empty. Focused result: 2 passed, 0 failed.

Full regression after the review fix: 106 passed, 0 failed, 1 Windows-only test skipped (107 total). Both commands were run through verify with selected input binding and recorded exited-zero/unchanged, complete output and no truncation. Actual assertion counts were inspected; these are not zero-test success claims.

After the review fix, status correctly marked the initial receipt stale and named bin/tracecraft.mjs and test/help.test.mjs as modified. Earlier receipts were preserved; new final receipts were created. Raw receipts and machine-specific config are local pilot artifacts, not committed portable attestations. Regenerate evidence for another checkout/revision.
