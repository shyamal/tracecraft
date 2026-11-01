# Check your local setup

From the Tracecraft checkout, inspect the current directory:

```sh
npm ci --ignore-scripts
node bin/tracecraft.mjs doctor
```

To inspect a different application's directory, keep using the Tracecraft CLI and select the project explicitly:

```sh
node /path/to/tracecraft/bin/tracecraft.mjs doctor --project /path/to/my-app
```

The toolkit resources are checked relative to the CLI installation, while project checks use the selected application directory. No installation, repair, repository initialization, upgrade, network call or model invocation occurs. Doctor does not run project scripts or tests. Its only child processes are read-only `git --version` and `git rev-parse --is-inside-work-tree`, each bounded to three seconds and 64 KiB of output.

## What the report means

Output is JSON containing `ok`, `scope`, `project`, `toolkitVersion`, `checks` and status `counts`. Every check has a stable `id`, status, message and a remedy when useful.

| Check | Meaning |
|---|---|
| `runtime` | Current Node.js meets the package's >=24 engine minimum. This is not a live check of Node release support or patch currency. |
| `toolkit.manifest` | The package metadata identifies Tracecraft and has a version. |
| `toolkit.resources` | CLI modules, bundled schemas, seven workflow skills, guidance and templates are readable nonempty files. This does not verify their semantic correctness or integrity. |
| `project.directory` | The selected path is an accessible directory. |
| `git.available` | Git responds locally. Missing/unresponsive Git is a warning: contract commands can still run. |
| `project.git` | Git reports a working tree. A non-repository, bare repository or Git access refusal is a warning; Doctor does not change Git safety settings. |
| `project.artifacts` | `.tracecraft` is an accessible directory, absent, or conflicting with another file. Artifact contents and contract validity are not checked. |
| `project.config` | Notes whether a config path exists. Configuration loading is not implemented; contents are neither read nor executed. |
| `host.integration` | Explicitly states that native host installation, authentication and model access are not checked. |

Statuses are `pass`, `warn`, `fail` and `info`. `ok` means no failed setup checks; warnings and information can coexist with success. New projects without `.tracecraft` or configuration are valid. Start with `tc-specify` when ready to create feature artifacts.

Exit codes: 0 if no checks failed, 1 for a diagnosed setup failure, 2 for invalid command usage or an unexpected CLI error. Duplicate/unknown flags and missing option values are rejected.

## Boundaries

The CLI and its imported modules must start before diagnostics can run. Missing validator dependencies or bundled schemas can prevent Doctor itself from launching; run `npm ci --ignore-scripts` or restore the complete checkout/package in that case. Doctor offers guidance and never repairs files automatically.

The report includes the selected project path. It does not dump environment variables, credentials, Git remote URLs or config contents. Inherited `GIT_*` overrides are cleared for the probes so a different repository cannot be accidentally reported as the selected project. A reachable Git executable on PATH is assumed to be trusted; this command is not a process sandbox.

Passing this check is not evidence of working application code, passing tests, installed slash commands or a certified AI-host integration. Follow it with `check`, `context` and the relevant workflow skill.
