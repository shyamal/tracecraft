# Check receipt status

Run a read-only comparison against an explicitly selected project:

```sh
node bin/tracecraft.mjs status /private/evidence/run-001.json --project /app
```

The command validates the receipt and rehashes the exact selection recorded in an unchanged v2 binding. It never executes recorded argv, loads command settings for execution, edits files or rewrites evidence. It checks one explicit receipt; it does not discover the newest run or aggregate a feature's verification history. Status can run on Windows even though command execution currently requires POSIX.

## Freshness states

| State | Meaning |
| --- | --- |
| `current` | Current selected bytes/modes match the recorded before/after fingerprints. |
| `stale` | A full scan completed and the selected inputs differ; added, removed and modified paths are listed. |
| `unbound` | A v1 receipt has no recorded input fingerprints. No comparison is attempted. |
| `unstable-run` | The original run recorded changed inputs or an unavailable post-run scan. Restoring files cannot repair that observation; no current comparison is attempted. |
| `unavailable` | Current inputs could not be fully scanned, for example a missing explicit file, a symlink, permission failure or scan limit. |

Removing a file within a selected directory appears as a stale removal. Removing an explicitly selected file makes its scan unavailable; both fail closed. Changes to excluded evidence do not change the digest. The exclusion policy is the one stored in the receipt, not a newly inferred policy. Configuration changes themselves are fingerprinted rather than executed.

## Results and exit codes

JSON separates execution outcome from freshness. `ok` is true only when an unchanged v2 run still has matching selected inputs, recorded exit zero, completed output draining and no recorded process error. All other valid receipts produce `ok: false` with reasons. Output truncation is reported separately and does not alone change this narrow status; assertion coverage is never inferred from logs.

- Exit 0: `ok: true` under the process/input conditions above.
- Exit 1: valid receipt, but failed/incomplete execution or unbound, stale, unstable or unavailable inputs.
- Exit 2: usage error, invalid project, unreadable receipt, invalid JSON or failed receipt validation.

The output contains only metadata, changed paths and reasons, not saved argv, environment values or raw logs. `compared` says whether a full current scan succeeded; it is false for unbound, unstable-run and unavailable states. `assertionCoverageChecked` and `authenticityChecked` remain false.

## Limits

This is receipt status, not feature readiness or a release gate. It does not assess requirements, test discovery, assertion quality, review approval or whether the selected scope covers all dependencies. Receipts are editable and unsigned. A copied checkout can match the same fingerprint without being the original execution location. Paths and hashes may still be sensitive.

Matching snapshots do not establish that files were immutable during the original run, and the scan itself is not atomic. A result can become stale immediately afterward. Restoring exact bytes/modes can make an originally unchanged run current again; it cannot make an unstable run usable. Environment changes, tool upgrades and external services remain outside the comparison unless represented in selected files. See [fingerprint limits](FINGERPRINTS.md) and [receipt trust boundaries](RECEIPTS.md).
