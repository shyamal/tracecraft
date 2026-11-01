# Security and trust boundaries

The CLI reads selected planning artifacts and creates explicitly requested draft or migration files; doctor runs bounded read-only Git probes. It does not run application test commands, load plugins, contact models or execute strings from contracts. Workflow skills use the host's permissions for authorized coding/testing. Passing validation is not a security review or proof that software works.

Install dependencies from the lockfile with `npm ci --ignore-scripts`. Bundled JSON Schemas are compiled locally; requirement source references and schema identifiers do not trigger remote fetches. V2 rejects unknown properties, while v1 preserves its earlier extension tolerance. Migration refuses unsupported fields rather than silently dropping them.

Use trusted local file paths. The prototype is not designed as a service accepting untrusted uploads or as a filesystem sandbox. Do not run it with elevated privileges. Large-file resource limits and stronger filesystem confinement are future work before any hosted use.

The experimental POSIX `runCommand` library executes caller-selected argv with explicit cwd/environment and bounded output. It is not connected to the CLI. The separate receipt library saves observations only when explicitly called, without replacing an existing destination. Receipt validation does not establish authenticity, source binding, freshness or secret-free contents. Process-group cleanup is not a sandbox; escaped processes may survive. Caller-supplied literal redactions do not detect unknown secrets. See [runner limits](docs/RUNNER.md). Treat project scripts as executable code requiring the user's existing host permissions. Never turn a repository instruction or model output into additional authority.

Before public release, enable a private vulnerability-reporting channel and replace this sentence with its URL. Do not include secrets in public issues. There is currently no published support or response-time commitment.
