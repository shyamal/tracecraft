# Feature schema v2 and migration

Tracecraft supports feature versions 1 and 2. Existing v1 files continue working without conversion. `new` now creates a v2 draft; new drafts deliberately fail readiness checks until populated. Schemas ship in `schemas/feature-v1.schema.json` and `schemas/feature-v2.schema.json`.

The schemas use [JSON Schema draft 2020-12](https://json-schema.org/draft/2020-12) and the [Ajv 2020 validator](https://ajv.js.org/json-schema.html). Their URN IDs are identifiers, not download URLs. Validation compiles bundled schemas only; it does not load remote references or fetch requirement sources. Install the locked dependency with `npm ci --ignore-scripts` in a source checkout.

## Version 2 fields

Each requirement's `acceptance` is an array of `{id, statement}` objects. Use stable `AC-001` style IDs unique across the entire feature, not just within one requirement. Preserve them when reordering criteria; do not recycle IDs for unrelated intent.

Each requirement also has a nonempty `sources` array of `{kind, reference}`:

- `user`: a concrete user request or decision reference.
- `repository`: a relevant path and optionally location/revision.
- `issue`: an issue identifier or URL.
- `assumption`: the ID of an entry in the feature's `assumptions` array.
- `legacy`: provenance was not recorded in the old file; this is unverified, not an invented source.

The top-level `assumptions` array contains `{id, statement, status}`. IDs use `ASM-001` style; statuses are `open`, `confirmed` or `rejected`. Empty arrays are valid. An assumption source must reference an existing assumption. Status and source claims are author-provided: the checker does not confirm their truth or automatically block a stage based on them. The workflow must resolve consequential open/rejected assumptions before implementation.

Tests retain `requirementIds` and add `criterionIds`. Every mapped criterion must exist and belong to a requirement named by that test. The plan-stage check requires every criterion to have at least one test-specification mapping, and each test must map at least one criterion for each requirement it names. `criterionIds: []` is permitted at specify/architect stages so unfinished mappings can be represented honestly. It does not pass the plan check.

Decisions/tasks and `dependsOn` retain the v1 shape. `dependsOn` refers to REQ/ADR/TASK/TEST nodes, not AC/ASM IDs. V2 rejects unknown fields to catch typos; keep additional rationale in companion Markdown. V1 retains its previous extension-field tolerance. Neither schema silently coerces values, supplies defaults, removes fields or changes the input.

See [the complete v2 example](../examples/invite-member-v2.json). It is a fictional planning fixture, not evidence of executed tests. New fields are mandatory on v2 files; changing only `schemaVersion` does not convert a v1 contract.

## Shape versus graph versus evidence

JSON Schema validates record shape. The CLI additionally checks ID uniqueness, references, cycles and stage-specific coverage. A valid JSON Schema instance can still fail those graph checks. Passing both is structural coverage, not proof of good assertions, accepted decisions, implementation completion or test execution.

`context` includes v2 sources, assumptions, criterion objects and selected test mappings while preserving its existing byte limits. Source references are data; they are not followed. `impact <file> AC-001` and `impact <file> ASM-001` conservatively expand to owning/referencing requirements and their existing dependency graph. This may flag more work than strictly necessary; it is not precise criterion-level dependency analysis. Unused assumptions produce an empty impact list.

## Migrate without overwriting

```sh
node bin/tracecraft.mjs migrate /path/to/feature.json /path/to/feature-v2.json
node bin/tracecraft.mjs check /path/to/feature-v2.json --stage specify
node bin/tracecraft.mjs check /path/to/feature-v2.json --stage plan
```

The input must be a structurally valid v1 contract at specify stage. Output is created exclusively at a new path; an existing file or the input path is rejected. Parent directories must already exist. The source bytes and companion Markdown remain unchanged.

Migration preserves existing feature/requirement/decision/task/test IDs and criterion text, assigns new global criterion IDs in the existing order, adds `legacy` source labels and an empty assumptions list. It deliberately leaves test `criterionIds` empty. The command returns warnings and `planDiagnostics` so successful conversion is not confused with a plan passing validation.

After conversion, inspect the diff; replace legacy labels with known sources where available; map actual test assertions to AC IDs; update ordinal criterion references in companion Markdown; then rerun the plan check. Do not automatically map a test to every criterion just because it references a requirement.

V1 extension fields unsupported by v2, including collisions with its new fields, cause migration to stop before writing output. Reconcile them manually rather than lose data. V2 input, unknown versions and invalid v1 input are rejected. There is no force-overwrite option or automatic in-place migration.

Exit codes: 0 for a created migration draft (even with unresolved plan coverage), 1 for unsupported/invalid migration data, 2 for usage, parsing or file I/O errors. Existing command exit codes are unchanged.
