# Execution receipts

The receipt library persists the runner's process observations as versioned JSON. It does not execute commands, interpret assertions, bind source inputs or decide freshness. There is still no `tracecraft verify` CLI command.

## Use from a local script

```js
import { runCommand } from './src/runner.mjs';
import { saveReceipt, readReceipt } from './src/receipts.mjs';

const observation = await runCommand({
  argv: [process.execPath, '--test'],
  cwd: '/absolute/path/to/application',
  env: {},
  redact: [], // Supply known sensitive literals before running.
});
await saveReceipt('/existing/private/directory/run-001.json', observation);
const receipt = await readReceipt('/existing/private/directory/run-001.json');
```

Select a new filename for each attempt. Save failure and cancellation observations too. The parent directory must already exist. If saving fails, report that failure explicitly; do not rerun an effectful command merely to retry storage. The in-memory observation remains available to the caller.

## Format and validation

`schemas/receipt-v1.schema.json` defines a strict envelope with `schemaVersion: 1`, `kind: execution-receipt` and the original `observation`. Unknown versions/properties are rejected. `validateReceipt` adds outcome consistency checks, canonical UTC timestamp checks and the runner's one-MiB-per-stream output limit. It returns diagnostics without coercing or editing data. Saving and reading both validate; invalid input throws an error with `code: INVALID_RECEIPT` and diagnostics. Invalid JSON and filesystem failures retain their native errors.

A zero exit code remains `exited-zero`, not `passed`. The `provenance: runner` field is a declared label, not authentication: a caller can manufacture an observation or edit a saved file. These receipts are not signed, tamper-proof, independently verified or automatically fresh. No requirement/test coverage is inferred from their existence. Wall-clock timestamps may move backwards; duration is measured separately by the runner.

## Storage boundary

Saving writes and syncs a private temporary file in the destination directory, then publishes it with a hard link that refuses an existing destination. This avoids exposing partially written final files and never overwrites existing receipts. Concurrent writers to the same destination have one winner; other writers receive an error. Filesystems without hard-link support fail rather than fall back to an overwrite-prone operation. POSIX files are created with mode 0600; Windows access follows filesystem permissions.

Storage is capped at 16 MiB including JSON formatting. The reader reads at most that limit plus one byte, rejects non-regular files and symlinks, parses JSON and validates it. Trusted local paths are required; these checks are not protection against hostile filesystem races. Publication is not a guarantee of directory durability after sudden power loss. A crash may leave a hidden temporary file; a cleanup error after publication may return an error even though the receipt exists. Inspect the destination before retrying and preserve existing evidence.

Stored text is exactly the runner's sanitized observation; this library does not detect or redact additional secrets. Inspect output and argv before sharing. Do not commit receipts by default merely because they passed validation. See [runner limits](RUNNER.md) for command authorization, redaction and process cleanup boundaries.

The storage library is portable; actual runner execution remains POSIX-only. Cross-platform filesystem behavior requires CI verification. CLI command configuration, input fingerprints and freshness gates are the next integration steps.
