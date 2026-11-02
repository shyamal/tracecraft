# Aggregate a feature's declared evidence

`evidence` summarizes explicitly required commands and selected receipts for one feature. It checks plan-stage structure, declared test coverage, receipt identity, execution outcome and selected-input freshness. It never runs a command, chooses a passing receipt, discovers a latest run, edits evidence or approves a release.

## Declare required checks

Create an evidence manifest inside the application. This example is illustrative; use the feature's actual test IDs and configured commands:

```json
{
  "schemaVersion": 1,
  "feature": ".tracecraft/features/invite-member/feature.json",
  "checks": [
    {
      "commandId": "unit",
      "testIds": ["TEST-001"],
      "receipt": ".tracecraft/local/receipts/unit-001.json"
    },
    {
      "commandId": "integration",
      "testIds": ["TEST-002"],
      "receipt": null
    }
  ]
}
```

All feature, receipt and configuration paths are relative to the explicit project root. They must remain inside it without traversal or symlinks. The manifest itself must resolve inside the project. Receipts stored externally must be deliberately placed inside the project to use this command; copying does not authenticate them.

The strict versioned manifest accepts 1–100 checks, with unique command IDs. Every command must exist in the current `.tracecraft/config.json`. Every planned test must be mapped to at least one required command; unknown test IDs and uncovered tests block aggregation. A command can cover multiple tests, and a test can require multiple commands. Every listed command is required. `receipt: null` declares that evidence is missing; a missing receipt file is also reported as missing.

This mapping is a user-maintained claim about intended coverage, not proof that a command discovered or executed those tests. The tool cannot determine whether required checks were omitted by assigning every test to an inadequate command. Review this manifest with the feature plan and actual assertions.

## Collect and evaluate

1. Configure commands with `inputs` so verify produces bound v2 receipts. Include relevant source, tests and configuration. Exclude generated receipt directories. Keep the manifest outside the selected inputs, or explicitly exclude it if receipt-pointer edits would otherwise invalidate every run; its policy must be reviewed separately.
2. Run each command through verify with a new receipt filename. Record the exact chosen file in the manifest. Failed attempts remain evidence; do not overwrite them or replace them silently with a passing run from another scope.
3. Run from the Tracecraft checkout:

```sh
node bin/tracecraft.mjs evidence /app/.tracecraft/features/invite-member/evidence.json --project /app
```

A receipt only satisfies its check when it is v2, names this exact feature path, names the selected command, binds `.tracecraft/config.json`, and passes the [receipt status](STATUS.md) checks. A matching command from another feature, a legacy receipt or a stale success is unusable.

## Output and exits

JSON reports structural and policy diagnostics separately, then each check as `usable`, `missing` or `unusable`. Valid receipt statuses include execution outcome, freshness and changed paths. Invalid/unreadable receipts are isolated to their checks so other checks can still be assessed. Summary counts include `notEvaluated` when structural or policy errors prevent receipt evaluation.

`ok` is true only when structure and policy are valid, every declared check has usable evidence, and the manifest/feature/config definitions are unchanged across aggregation. `inputsStable` reports that final definition check. These reads and individual freshness scans are not an atomic project snapshot; files can change between checks or immediately afterward.

- Exit 0: all declared evidence conditions above hold.
- Exit 1: invalid feature structure, incomplete/invalid check mapping, missing or unusable evidence, or changed definitions during evaluation.
- Exit 2: invalid manifest/schema, invalid configuration, invalid project or unreadable top-level inputs, or usage errors.

Manifest, contract and configuration reads are each capped at 1 MiB; receipt and fingerprint limits apply separately. Evaluation may scan inputs once per receipt. Stored commands, scripts and environment values are never executed by aggregation.

`assertionCoverageChecked` and `reviewReadinessChecked` remain false. Receipts are editable and unsigned; a green aggregate is not authentication, proof of behavior, completed review or feature readiness. Automated readiness gates and review evidence are separate work. V1 contracts and feature v2 contracts are supported through the existing structural validator; receipts must be v2 for binding.
