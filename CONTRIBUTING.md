# Contributing

This project is a prototype. Begin with the scoped backlog in `docs/ROADMAP.md`.

Run `node --test` and the example CLI checks before submitting a change. Keep graph logic pure and separate from file operations. Add tests for behavior, malformed input and regression cases; avoid tests that merely restate source text.

Contract changes require a schema-version decision and migration notes. Prompt changes require a scenario explaining the intended behavioral improvement. Host support requires a real workflow run; successful installation alone is insufficient.

PRs should state the problem, changed behavior, validation and limitations. Do not introduce automatic model calls, telemetry, updates or publication. Avoid real credentials and customer information in fixtures.

Contributions are made under the project's MIT license. The repository is maintained by [shyamal](https://github.com/shyamal) at [shyamal/tracecraft](https://github.com/shyamal/tracecraft). Use repository issues for non-sensitive questions and proposals. Package publication and release automation remain future work.
