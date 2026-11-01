# Prototype validation

Executed locally on 1 November 2026 with Node.js 26.5.0.

`node --test`: 11 tests passed; zero failed or skipped.

Validated behaviors: complete contract, incomplete draft, malformed nested input, unsupported version, duplicate ID, unknown reference, missing test mapping, wrong reference type, empty acceptance criterion, malformed dependencies, cycles/self-cycles, duplicate edges, transitive impact, exclusive file creation, parse errors, absent input files, invalid CLI arguments and exit codes.

`node bin/tracecraft.mjs impact examples/invite-member.json REQ-001` returned:

```json
{
  "changed": "REQ-001",
  "affected": ["ADR-001", "TASK-001", "TASK-002", "TEST-001", "TEST-002"],
  "scope": "declared-dependencies-only"
}
```

This is evidence for the toolkit prototype, not the fictional invitation application. CI workflow files are included but have not run on GitHub. Windows/Linux, host installation, live agent workflows, evidence freshness and application-test execution remain unverified or unimplemented as described in the roadmap.
