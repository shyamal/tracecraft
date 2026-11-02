# Run a configured check

`verify` executes one explicitly selected command on macOS/Linux and saves its process observation as a receipt. It requires a plan-valid feature contract. It does not discover tests, determine assertion coverage or decide current freshness. Optional input selection records before/after fingerprints. Windows execution is not supported yet.

## Configure and inspect

Create `.tracecraft/config.json` in your application with schema version 1. For example, replace the executable path with your actual Node installation:

```json
{
  "schemaVersion": 1,
  "commands": {
    "unit": {
      "argv": ["/absolute/path/to/node", "--test"],
      "cwd": ".",
      "env": {},
      "timeoutMs": 30000,
      "maxOutputBytes": 65536,
      "redact": []
    }
  }
}
```

Command IDs are lowercase names containing letters, digits or hyphens, starting with a letter. Only `argv` is required per command. `cwd` defaults to the project root and must resolve within it, including through symlinks. Configuration must also resolve inside the project. Unknown fields and versions are rejected; commands are never read from feature prose. Config input is limited to 64 KiB and feature input to 1 MiB.

Inspect the command and any scripts it invokes before running it. Explicit argv avoids implicit shell interpolation but does not make executables safe. Existing host permissions apply. Environment values are explicit; none are inherited automatically. Use an absolute executable path, and supply PATH only when child tools need it. Avoid storing secrets in tracked configuration. `redact` accepts up to 100 nonempty literals of at most 1024 characters; matching uses the same longest-first, single-pass literal replacement as execution. Generated replacement markers are not processed again. It does not detect unknown or encoded secrets.

## Preview, then execute

Run from the Tracecraft checkout, replacing the paths. The receipt parent directory must already exist; choose a new receipt filename for each attempt.

```sh
node bin/tracecraft.mjs verify /app/.tracecraft/features/invite-member/feature.json --project /app --command-id unit --receipt /private/evidence/run-001.json --dry-run
node bin/tracecraft.mjs verify /app/.tracecraft/features/invite-member/feature.json --project /app --command-id unit --receipt /private/evidence/run-001.json
```

Preview validates the inputs and checks the destination without running the command or creating files. It shows sanitized argv/cwd, environment key names, limits and destination. It does not lock configuration or authorize later changes; review the actual configuration used at execution time.

Relative feature, project and receipt paths are resolved from the invocation directory. Command cwd is relative to the selected project. The feature must reside inside that project. Existing receipt destinations, missing parents, invalid configuration and invalid contracts fail before execution. Filesystem checks are not protection against hostile races.

## Outcomes

The CLI writes a JSON summary containing command ID, feature ID, receipt path, outcome and output completeness/truncation indicators. Without input selection it reports `inputsBound: false` and stores a v1 observation-only receipt. With input selection it reports `inputsBound: true` and an inputState, and stores a v2 receipt associating the feature/config paths and command ID with before/after manifests. Neither form maps results to test assertions. `freshnessChecked` remains false: verify itself does not perform a later-time check; use the separate [status command](STATUS.md) afterward. Read [receipt limits](RECEIPTS.md) before treating it as evidence.

- Exit 0: a valid preview, or command exit zero with a saved receipt and no changed/unavailable input comparison. This does not mean behavioral verification passed.
- Exit 1: invalid feature contract, a saved nonzero/spawn-error/signalled/timed-out/cancelled observation, or a changed/unavailable input comparison even with command exit zero.
- Exit 2: usage, configuration, unsupported platform, input/output or receipt-storage failure.

SIGINT/SIGTERM requests cancel the running check and attempt to save the cancellation observation. Forced termination cannot guarantee a receipt. Timeout defaults to 30 seconds. Output is capped per stream; commands that escape their process group are outside cleanup guarantees.

If receipt storage fails after execution, the CLI reports that the command ended but persistence failed. Inspect the destination before retrying; do not automatically rerun a command that may have side effects. Preflight checks cannot prevent concurrent writers or a command itself from creating the receipt destination. The store refuses to overwrite it. Treat stored output as potentially sensitive even after literal redaction.

## Bind selected inputs

Add an optional `inputs` object to a command in config v1:

```json
"inputs": {
  "paths": ["src", "test", "package.json", "package-lock.json"],
  "exclude": []
}
```

Select files that actually exist and matter to the command. Feature and configuration files are always added; attempts to exclude them fail before execution. Bound feature/config paths cannot be symlinks within the project. Project-root aliases are resolved. If the receipt destination is inside the project, that exact path is automatically excluded; exclude other generated evidence directories explicitly when selecting their parents. The preview shows the effective selection and initial digest.

Before execution, the fingerprint must match the exact feature/config bytes parsed to choose the command. After execution the same selection is fingerprinted again. A v2 receipt records `unchanged`, `changed` or `unavailable`; unavailable means a post-run scan failed, with an error code and no after snapshot. The execution observation is retained in every case. Pre-run scan failures prevent execution.

`unchanged` means the two selected snapshots match, not that inputs were immutable during execution or remain current now. These are non-atomic scans: changes made and restored during a run may be undetected. Tool binaries, environment and external services are not bound unless represented by selected files, and filenames/hashes may be sensitive. See [fingerprint limits](FINGERPRINTS.md). Existing commands without inputs still produce v1 receipts; neither version proves assertion coverage or authenticity.
