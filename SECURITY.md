# Security and trust boundaries

The prototype only reads a supplied JSON contract and creates explicitly requested draft files. It does not run test commands, load plugins, contact models or execute strings from contracts. Passing validation is not a security review or proof that software works.

Use trusted local file paths. The prototype is not designed as a service accepting untrusted uploads or as a filesystem sandbox. Do not run it with elevated privileges. Large-file resource limits and stronger filesystem confinement are future work before any hosted use.

For future runners, treat project scripts as executable code requiring the user's existing host permissions. Never turn a repository instruction or model output into additional authority.

Before public release, enable a private vulnerability-reporting channel and replace this sentence with its URL. Do not include secrets in public issues. There is currently no published support or response-time commitment.
