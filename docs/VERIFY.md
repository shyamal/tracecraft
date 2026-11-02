# Run a configured check

`verify` executes one explicitly selected command on macOS/Linux and saves its process observation as a receipt. It requires a plan-valid feature contract. It does not discover tests, determine assertion coverage, bind source inputs or decide freshness. Windows execution is not supported yet.

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

Inspect the command and any scripts it invokes before running it. Explicit argv avoids implicit shell interpolation but does not make executables safe. Existing host permissions apply. Environment values are explicit; none are inherited automatically. Use an absolute executable path, and supply PATH only when child tools need it. Avoid storing secrets in tracked configuration. `redact` accepts up to 100 nonempty literals of at most 1024 characters; it does not detect unknown or encoded secrets.

## Preview, then execute

Run from the Tracecraft checkout, replacing the paths. The receipt parent directory must already exist; choose a new receipt filename for each attempt.

```sh
node bin/tracecraft.mjs verify /app/.tracecraft/features/invite-member/feature.json --project /app --command-id unit --receipt /private/evidence/run-001.json --dry-run
node bin/tracecraft.mjs verify /app/.tracecraft/features/invite-member/feature.json --project /app --command-id unit --receipt /private/evidence/run-001.json
```

Preview validates the inputs and checks the destination without running the command or creating files. It shows sanitized argv/cwd, environment key names, limits and destination. It does not lock configuration or authorize later changes; review the actual configuration used at execution time.

Relative feature, project and receipt paths are resolved from the invocation directory. Command cwd is relative to the selected project. The feature must reside inside that project. Existing receipt destinations, missing parents, invalid configuration and invalid contracts fail before execution. Filesystem checks are not protection against hostile races.

## Outcomes

The CLI writes a JSON summary containing command ID, feature ID, receipt path, outcome and output completeness/truncation indicators. It deliberately reports `inputsBound: false` and `freshnessChecked: false`. The receipt stores the process observation only; it does not persist a feature/test association or source snapshot. Read [receipt limits](RECEIPTS.md) before treating it as evidence.

- Exit 0: a valid preview, or command exit zero with a saved receipt. This does not mean behavioral verification passed.
- Exit 1: invalid feature contract, or a saved nonzero/spawn-error/signalled/timed-out/cancelled observation.
- Exit 2: usage, configuration, unsupported platform, input/output or receipt-storage failure.

SIGINT/SIGTERM requests cancel the running check and attempt to save the cancellation observation. Forced termination cannot guarantee a receipt. Timeout defaults to 30 seconds. Output is capped per stream; commands that escape their process group are outside cleanup guarantees.

If receipt storage fails after execution, the CLI reports that the command ended but persistence failed. Inspect the destination before retrying; do not automatically rerun a command that may have side effects. Preflight checks cannot prevent concurrent writers or a command itself from creating the receipt destination. The store refuses to overwrite it. Treat stored output as potentially sensitive even after literal redaction.

The [input fingerprint library](FINGERPRINTS.md) is available for explicit file selections, but verify does not yet attach fingerprints to receipts. Config v1 does not accept an input selection field; do not assume the library is automatically applied.
