# Tracecraft CLI help: first real-project feature pilot

Date: 2 November 2026. Project: Tracecraft itself, in an isolated working copy of its actual source. Host: macOS, Node 26.5.0. One assistant performed all stages; this is not an independent review, cross-host benchmark or a second-project pilot. Model cost and end-to-end human time were not measured.

## Delivered behavior and artifacts

`help`, `--help` and `-h` now return successful JSON usage and all implemented command names. Extra help arguments remain errors. Help does not initialize or mutate the caller's project. The feature contract, brief, design, plan, implementation notes, verification report and review history live under `.tracecraft/features/cli-help/`.

## Observed sequence

1. Specify, architect and plan checks each passed on their stage's actual artifacts.
2. Before implementation, the new alias-success assertion failed because help exited 2; the negative-input test passed.
3. The first implementation passed the focused tests. Same-assistant review found that the command list omitted help itself, despite AC-001 requiring all command names. The test had omitted that assertion too. The original changes-requested report is retained.
4. Fixed the list and strengthened the assertion. Status marked the previous receipt stale and named `bin/tracecraft.mjs` and `test/help.test.mjs` as modified.
5. New verify runs recorded complete, non-truncated output and unchanged input fingerprints. Focused checks: 2 passed, 0 failed, 643 ms runner duration. Full regression: 106 passed, 0 failed, 1 Windows-only skip (107 total), 3,011 ms runner duration. These timings describe this single local run, not a performance benchmark.
6. Evidence aggregation passed with both required commands. A new structured, self-reported review record produced ready planning/execution/review gates. This did not grant approval or authenticate the review.
7. Review-packet export produced 19,770 bytes, with all selected planning documents included and evidence passing. The packet still warned that diff scope was unverified and additional material was omitted.

Final execution-input digest for this local run: `c2265bb6c7d9b6f7ca28782d7d75ff4c8fed80c0f0c3b6bcca305dfaae57cafa`. It includes machine-specific local configuration; it is historical evidence, not an expectation for another checkout.

## Friction discovered

- Several skill passages still denied implemented receipts/freshness capabilities. They were corrected to describe the existing commands and their trust limits.
- A passing test set missed a requirement boundary until review inspected both the implementation and assertions. Structural criterion mappings alone did not catch it.
- Command configuration needs a local executable path when using an empty environment. No machine-specific configuration is committed.
- Review-record creation currently requires explicitly computing the input snapshot. A future helper could reduce that work, but should not manufacture review conclusions.

## Reproduce in a fresh checkout

Install dependencies, then create `.tracecraft/local/pilot/`. Create `.tracecraft/config.json` with two command entries using your actual Node executable path: `help` runs `--test test/help.test.mjs`; `regression` runs `--test`. Use input paths `bin`, `src`, `schemas`, `test`, `skills`, `package.json`, `package-lock.json`, and `.tracecraft/features/cli-help/feature.json`. Preserve any existing project configuration rather than overwriting it.

Run `check` for the three planning stages. Preview each command with verify, then execute with fresh receipt paths; the checked-in evidence manifest names `.tracecraft/local/pilot/help-final.json` and `regression-final.json`. If those already exist, choose new paths and update the manifest. Run evidence and status. Perform your own review before creating a new review record, following `docs/READINESS.md`, then run readiness. Export a selected diff with review-packet if useful.

Raw receipts, generated diff/packet and the structured review record remain in the local pilot copy, outside version control. The checked-in evidence manifest is a reproducible selection, not a promise that local receipt files exist in a fresh clone. Regenerate evidence for the actual checkout; never treat this narrative as current execution evidence.

## Still outstanding

A separate real bug-fix pilot, an independent reader/reviewer, another application, Codex/Claude native host installation, comparative baseline, costs and public workflow benchmarks. This pilot establishes that the toolkit can exercise its own workflow on a small real feature; it does not complete the roadmap's two-project acceptance criteria.
