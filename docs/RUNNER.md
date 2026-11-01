# Local execution primitive

`src/runner.mjs` exports an experimental `runCommand` function for macOS/Linux. It is a library primitive, not a `verify` CLI command. The [receipt library](RECEIPTS.md) now saves and validates observations when explicitly called. Command configuration, source fingerprints, freshness and workflow gates remain planned. Windows execution is explicitly rejected until process-tree cleanup is implemented and tested there; existing planning CLI commands retain Windows support.

## Explicit inputs

```js
import { runCommand } from './src/runner.mjs';
const observation = await runCommand({
  argv: [process.execPath, '--test'],
  cwd: '/absolute/path/to/application',
  timeoutMs: 30_000,
  maxOutputBytes: 65_536,
  env: {},
  redact: [],
  // signal: an AbortController's signal, when cancellation is needed
});
```

Inspect and authorize the selected executable and arguments before calling. The function does not read commands from contracts or prose, and does not launch a shell. An explicitly selected shell, script or test program can still execute arbitrary code. There is no sandbox or host-approval mechanism inside this function.

The working directory must be explicit, absolute and resolve to an existing directory. Environment variables are not inherited; supply only values needed by the selected check, including PATH if its tools require it. Prefer absolute executable paths. No environment values are included in the returned observation.

Timeout defaults to 30 seconds and accepts 1–3,600,000 milliseconds. Output defaults to 65,536 bytes per stream and accepts 1–1,048,576 bytes. Standard input is closed. Cancellation before spawn returns a cancelled observation without executing anything. Invalid options or inaccessible directories reject before spawning.

## Observations and output

Results include sanitized argv/cwd, timestamps, duration, exit code, termination signal, error code and bounded stdout/stderr. Outcomes are `exited-zero`, `exited-nonzero`, `spawn-error`, `signalled`, `timed-out` or `cancelled`. Exit zero does not establish test discovery, assertion coverage or feature correctness. Missing executables produce a spawn-error observation; no files are written automatically.

Each output stream reports `text`, `observedBytes` and `truncated`. `outputComplete` records whether process streams closed before the final drain deadline; it does not override truncation. Literal secrets supplied in `redact` are replaced in output and argv/cwd, including matches spanning stream chunks. Capture memory is bounded; incomplete secret suffixes at the capture limit are discarded. Limits may also truncate the replacement marker. Redaction is not automatic secret detection: encoded, transformed or unknown secrets may remain. Inspect observations before sharing or persisting them; do not treat redacted output as a public artifact by default.

## Cleanup limits

Each invocation starts a separate POSIX process group. Timeout/cancellation kills the group; normal parent exit also kills remaining members. Output draining is capped at 250 milliseconds after termination. A program that deliberately escapes its process group can outlive this cleanup; this is not hostile-process containment. Cleanup errors are recorded as error codes. No claim is made that a command has no external effects or that an observation is tamper-proof.

## Validation

Tests cover nonzero and zero exits, literal shell syntax in argv, explicit environment, missing executables, timeout, cancellation, bounded and redacted output, invalid inputs and descendants holding inherited pipes. Windows rejection is tested on Windows; POSIX execution tests are skipped there. Cross-platform CI results must be checked separately from local test results.
