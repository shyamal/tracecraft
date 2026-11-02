# Evaluate declared feature readiness

The readiness command separates three checks: planning structure, execution evidence and a declared review bound to current inputs.

```sh
node bin/tracecraft.mjs readiness /app/evidence.json --project /app --review reviews/review-001.json
```

The evidence manifest uses the [existing format](EVIDENCE.md). The optional review path is relative to the project; omitting it explicitly blocks review readiness. The command reads files only. It does not run checks, create reviews, repair findings, approve a PR or merge anything.

## Gates

| Gate | Ready when |
| --- | --- |
| Planning | The feature passes plan-stage structural validation. This does not resolve product assumptions or approve design decisions. |
| Execution | The declared evidence aggregate passes: mappings are complete and every selected receipt is usable/current. |
| Review | A valid review record declares no findings and complete coverage, has no unresolved findings, and its fingerprint matches the required current inputs. |

All three must be ready for `ok: true` and exit 0. Blockers produce exit 1. Invalid top-level evidence/project inputs or CLI usage produce exit 2. An invalid, missing or unreadable optional review record is a review blocker (exit 1), not a reason to hide planning/execution results. When execution is blocked, review is marked blocked pending usable evidence rather than assessed against a different run.

`approvalGranted`, `authenticityChecked`, `assertionCoverageChecked` and `reviewClaimsVerified` remain false. These gates validate declarations and evidence consistency; they do not authenticate the reviewer, read prose for correctness, prove adequate assertions or grant release permission.

## Review record

Keep the narrative review in a Markdown file. After actually completing the review, save a separate JSON record using `schemas/review-v1.schema.json`:

- `schemaVersion`: 1.
- `feature`: exact project-relative feature path from the evidence manifest.
- `report`: project-relative path to a nonempty narrative report.
- `outcome`: `no-findings`, `changes-requested` or `incomplete`.
- `coverage`: `complete`, `partial` or `blocked`.
- `findings`: records with unique `id`, `summary` and boolean `resolved`. Open or deferred defects remain unresolved. Do not mark a finding resolved merely to satisfy a gate.
- `inputs`: an actual version-1 snapshot from `fingerprintInputs`, never invented hashes.

Capture inputs while reviewing and recheck relevant files before recording the final assessment. Finish the narrative report before taking the snapshot stored in the record. It must include:

1. The evidence manifest, feature contract and `.tracecraft/config.json`.
2. Every selected receipt and every file in those receipts' before-input manifests.
3. The narrative review report itself.
4. Any additional files that the review relies on, such as design notes and callers outside execution scope.

The gate enforces items 1–3. The reviewer is responsible for the adequacy of additional review scope. Choose exact paths or directory selections that include these files. Exclude the output JSON record itself if selecting its parent, so creating the record does not invalidate its snapshot. Keep review outputs outside execution inputs where appropriate; otherwise creating a review may correctly make the earlier execution stale.

For example, from a local script with access to the toolkit, after performing the review and writing the narrative:

```js
import { writeFile } from 'node:fs/promises';
import { fingerprintInputs } from '<toolkit>/src/fingerprint.mjs';

const inputs = await fingerprintInputs('/app', {
  paths: ['src', 'test', 'feature.json', '.tracecraft/config.json',
    'evidence.json', 'receipts/unit-001.json', 'reviews/review-001.md'],
});
// Only use these conclusions if the actual review supports them.
const record = {
  schemaVersion: 1,
  feature: 'feature.json',
  report: 'reviews/review-001.md',
  outcome: 'no-findings',
  coverage: 'complete',
  findings: [],
  inputs,
};
await writeFile('/app/reviews/review-001.json', JSON.stringify(record, null, 2), { flag: 'wx' });
```

Replace paths and conclusions with the real review. Preserve old reports/records and create a fresh record after repairs and re-verification. The script records a declaration; running it is not a review.

## Limits

The record and narrative are each limited to 1 MiB. Paths must stay inside the selected project without symlinks. Digest inconsistencies, missing required files, changed report/receipt bytes, incomplete coverage and unresolved findings block review. Readiness rechecks execution evidence after reviewing its input binding, but scans still do not form an atomic snapshot and can become stale immediately afterward.

A nonempty report and a `no-findings` declaration are not independent verification of review quality. Records and receipts are editable and unsigned. Recomputing hashes can conceal edits from consistency checks; this is a local workflow policy, not a security attestation. A ready result only applies to the declared feature, checks, review scope and observed inputs.
