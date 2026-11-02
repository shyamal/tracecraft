# Real bug-fix pilot: preview redaction

Date: 2 November 2026. Project: Tracecraft's actual source in an isolated working copy. Runtime: Node 26.5.0/macOS. One assistant found, implemented, tested and reviewed the fix. This is not independent review, a second-project pilot or security certification. No real credentials were used.

## Reproduced defect

Dry-run preview replaced configured literals sequentially, while the runner used a longest-first escaped regex in one pass. Given redact `["alpha", "alpha-beta"]`, preview exposed `[REDACTED]-beta` instead of replacing the whole configured value. With `["alpha", "REDACTED"]`, it rewrote the generated marker as `[[REDACTED]]`. Both new integration assertions failed against the existing implementation: 11 existing checks passed and 2 new checks failed.

## Workflow and fix

The contract and companion planning artifacts are under `.tracecraft/features/preview-redaction/`. Specify, architect and plan checks each passed at their stage. The chosen fix extracts the existing runner algorithm into `src/redaction.mjs` and shares it with preview, avoiding another independently maintained implementation.

Focused tests check both overlap orders, exact preview/receipt argv equality, output redaction, nonrecursive replacement markers, literal regex/replacement syntax and existing streaming/budget behavior. Review inspected the extraction, callers, assertions and doctor registration. No further supported defect was found in that scope; unknown/transformed-secret detection is outside this fix.

## Observed final results

- Focused verify run: 22 passed, 0 failed, 1 Windows-only skip (23 total); runner duration 3,133 ms.
- Full verify run: 110 passed, 0 failed, 1 Windows-only skip (111 total); runner duration 3,543 ms.
- Both observations recorded exit zero, complete/non-truncated output and unchanged selected input fingerprints.
- Evidence aggregation and declared planning/execution/review readiness passed in the pilot copy.
- Input digest: `e50f1429085d4cdaf3799d56af065df88ee1d2600736c9d6b2028d65f63a4850`.

The digest includes local configuration and is historical, not a portable expected value. Timing is one observed run, not a benchmark. Model cost and end-to-end human time were not measured. Raw receipts and machine-specific configuration remain local; no release or merge approval is implied.

## Reproduce

From a fresh checkout after installing dependencies, run:

```sh
node --test test/redaction.test.mjs test/runner.test.mjs test/verify.test.mjs
node --test
```

To replay the evidence workflow, configure two commands using your actual Node path: `redaction` runs the focused command and `regression` runs the full suite. Select `bin`, `src`, `schemas`, `test`, `package.json`, `package-lock.json` and `.tracecraft/features/preview-redaction/feature.json` as inputs. Preserve existing configuration. Create `.tracecraft/local/redaction/`, preview the commands, then verify with fresh receipt filenames. The checked-in evidence manifest names `focused.json` and `full.json` there; update it if using other filenames. Perform your own review before generating a structured review record and running readiness.

A fresh clone intentionally has no raw pilot receipts. Re-run for the actual checkout rather than treating this narrative as current evidence. Independent review, another application and native host integration trials remain outstanding; together with the CLI-help pilot, this supplies one same-assistant real feature and one real bug fix in Tracecraft itself.
