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

## First three skills update

Local validation on 1 November 2026 with Node.js 26.5.0:

- `node --test`: 16 tests passed, zero failed/skipped. New coverage verifies the specify→architect→plan handoff, early-stage validation of downstream nodes, unknown stages and malformed flags, and read-only CLI behavior.
- Skill-creator `quick_validate.py`: all three skill folders passed naming/frontmatter/scaffold validation. UI metadata was generated using the skill-creator helper.
- Local Markdown references resolved, including the shared contract and skill assets.
- `npm pack --dry-run`: included the three skills, templates, shared reference and evaluation cards. No package was published.

These are structural and packaging checks, not evidence of native-host installation or model behavior. The manual scenario cards in `evals/first-three-skills.md` await real-agent pilot results.

## Context command update

Locally executed with Node.js 26.5.0 on 1 November 2026: all 25 tests passed, zero failed/skipped. Nine context tests cover stage selection and prerequisites, repeated byte-identical JSON, raw-source hashes, explicit omissions, known-field projection, ignored document links, external-directory symlinks, UTF-8 budgets, source/packet overflow, invalid encoding/JSON, read-only behavior and CLI error cases. Existing 16 tests remain green.

The feature's own artifacts under `.tracecraft/features/context-command/` passed specify, architect and plan checks sequentially as they were authored. This is a same-session pilot of the three skills, not independent evaluation. A context packet was then generated from those artifacts for an implementation-stage handoff. Only selected-source completeness is claimed; no native-host certification, model-quality benchmark or application-test evidence is implied.

## Doctor command update

Locally executed with Node.js 26.5.0 on 1 November 2026: all 33 tests passed, zero failed/skipped. Eight diagnostic tests cover a healthy setup, unsupported runtimes, absent/empty toolkit resources, invalid manifests, invalid project paths, simulated Git absence/timeouts/refusals, permitted Git probe arguments, artifact path conflicts, unread configuration content, read-only behavior, paths with spaces and CLI option errors. Existing context, contract and stage tests remain green.

The CLI smoke test exercises real local Git and checks both the default working directory and an explicit project path. Failure-path unit tests inject Git probe outcomes; they do not certify host-specific timeout behavior. The setup report checks only local prerequisites and makes no claim about native host authentication, model access or application correctness.
