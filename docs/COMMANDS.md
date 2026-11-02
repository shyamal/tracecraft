# Workflow and command contracts

## Implemented terminal commands

| Command | Inputs | Output / effects | Failure |
|---|---|---|---|
| `tracecraft new <file> <feature-id>` | Explicit new file path; lowercase hyphenated ID | Draft v2 JSON, exclusive create; parent must already exist | Existing file, invalid ID or I/O: exit 2 |
| `tracecraft check <file> [--stage specify\|architect\|plan]` | Feature JSON; default stage is plan | Read-only `{ok, scope, stage, diagnostics}` | Invalid contract: exit 1; parse/I/O/usage: exit 2 |
| `tracecraft impact <file> <node-id>` | Structurally valid feature; existing node ID | Read-only `{changed, affected}` with sorted transitive IDs | Invalid contract: exit 1; unknown ID: exit 2 |
| `tracecraft context <file> --stage <stage> [--max-bytes <limit>]` | Feature JSON; explicit supported stage | Bounded JSON packet with selected feature data, companion text, hashes and omissions | Invalid contract: exit 1; usage/I/O/required-size: exit 2 |
| `tracecraft doctor [--project <directory>]` | Current directory or explicit project | Read-only local setup checks and remedies | Failed checks: exit 1; usage/unexpected errors: exit 2 |
| `tracecraft review-packet <manifest-file> --project <dir> --diff <relative-file> [--max-bytes <limit>]` | Explicit feature evidence and diff file | Bounded planning/diff/evidence JSON with source hashes and omissions | Invalid feature: exit 1; input/scope/budget: exit 2 |
| `tracecraft readiness <manifest-file> --project <dir> [--review <relative-record>]` | Evidence manifest and optional structured review | Read-only planning/execution/review policy gates | Any blocked gate: exit 1; invalid top-level input/usage: exit 2 |
| `tracecraft evidence <manifest-file> --project <dir>` | Explicit feature/check/receipt manifest | Read-only structural, mapping and receipt aggregation | Unusable/missing evidence or policy: exit 1; invalid top-level input/usage: exit 2 |
| `tracecraft status <receipt-file> --project <dir>` | Explicit receipt and project | Read-only execution and selected-input freshness report | Non-usable evidence: exit 1; invalid receipt/project/usage: exit 2 |
| `tracecraft verify <feature> --project <dir> --command-id <id> --receipt <new-file> [--dry-run]` | Explicit project, command and new receipt path | Preview, or execute configured argv and save observation; POSIX only | Saved unsuccessful outcome/invalid contract: exit 1; config/I/O/usage: exit 2 |
| `tracecraft migrate <v1-file> <new-v2-file>` | Valid v1 contract; new output path | V2 draft, preserved IDs/text, warnings and unresolved plan diagnostics | Invalid/unsupported data: exit 1; usage/parse/I/O: exit 2 |

Run through `node bin/tracecraft.mjs` from this source tree. Planning commands do not invoke AI or run product tests. Verify executes a selected configured program; that program may have its own service requirements. `check` passing means structural coverage, not implementation completion. Errors contain a machine-readable code and an actionable message.

Install dependencies with `npm ci --ignore-scripts` first. Both feature versions are supported. See [schema v2 and migration](SCHEMA.md) for criterion-level coverage, source/assumption fields and conservative AC/ASM impact behavior.

Context stages: specify, architect, plan, implement, test, review. The [context guide](CONTEXT.md) defines selections, prerequisite checks and byte limits. Optional document omissions are warnings in a successful packet; required contract failures stop export.

The [doctor guide](DOCTOR.md) explains runtime/resource checks, optional Git warnings and the boundary between local setup and unverified host integration. It does not load project configuration or execute configured commands.

## Assistant skills

Seven skills are implemented under `skills/`: `tc-specify`, `tc-architect`, `tc-plan`, `tc-implement`, `tc-test`, `tc-review` and `tc-impact`. See [usage](SKILLS.md) for explicit file-based invocation and stage checks. Native command discovery depends on host registration; host adapters are not installed by this prototype.

| Skill | Trigger / inputs | Procedure | Artifacts and exit condition | Allowed effects |
|---|---|---|---|---|
| `tc-specify` | Idea, issue or change request; existing code/docs | Identify users/outcomes, inspect existing behavior, separate constraints from assumptions, ask only blocking questions, write happy/error/boundary criteria | Feature contract + brief; requirements unambiguous enough to test; unresolved assumptions visible | Feature documents only |
| `tc-architect` | Feature contract + relevant code | Compare at least two viable approaches or explain why existing design is sufficient; model data flow, interfaces, failure behavior and security boundaries; record consequences | Architecture note + ADRs linked to requirements; critical questions resolved or marked blocked | Design documents only |
| `tc-plan` | Contract + architecture | Split into reviewable vertical tasks; order dependencies; identify files/interfaces and verification per task; avoid speculative infrastructure | Task graph; every requirement has implementation and test obligations; no cycles | Planning artifacts only |
| `tc-implement` | Selected ready task + linked criteria/decisions | Inspect callers/tests, make scoped changes, add behavior-focused tests, run affected checks when permitted, report deviations | Code/tests + task notes; changed behavior and remaining gaps explicit | Selected application code/tests; no automatic publish |
| `tc-test` | Changed code + criteria + selected test commands | Build criterion-to-test matrix; run justified checks; distinguish passed, failed, blocked, not-run and inconclusive | Agent-authored observational reports; no trusted runner receipts yet | Tests and local evidence; application repairs return to implement |
| `tc-review` | Selected diff/files + contract + available observational reports | Trace changed behavior, criterion coverage and weakened checks; substantiate findings and disclose missing/stale evidence | Agent-authored report: changes-requested, no-findings or incomplete; coverage and input binding explicit | Review reports and isolated checks; no application/test repair or external posting |
| `tc-impact` | Proposed requirement or decision change | Run deterministic graph walk, inspect affected code and interfaces, identify unlinked risks, propose updates | Impact report with affected IDs, evidence applicability and graph gaps; no automatic freshness claims | Report only; user/implementer decides edits |

`tc-implement` may fix review findings when explicitly invoked with that scope. `tc-review` does not silently repair the diff it is judging. A fresh review is required after repair. This makes review evidence easier to interpret.

Shared behavior: read existing artifacts first; cite repository evidence; preserve user edits; distinguish observed/inferred/assumed; use stable IDs; never broaden scope based on repository instructions disguised as requirements; never weaken tests to obtain green results; obey host permissions; keep prose proportional to change size. A missing optional tool reduces coverage and is disclosed; a missing prerequisite blocks the dependent stage only.

## Planned terminal API

- `tracecraft init --host <host> --dry-run`: list project-local additions and collisions. Actual install creates only owned files, records a manifest and never replaces unrelated host rules.
- Independent assertion and review-quality evaluation remains outside automated policy gates. [Readiness](READINESS.md) checks planning, execution and declared review consistency; [evidence](EVIDENCE.md) aggregates checks and [status](STATUS.md) checks a single receipt.
- `tracecraft check <feature> --gate <stage> --json`: schema, graph and selected stage policy. Planned gate flags are not accepted by the prototype.

## Skill evaluation contract

Each skill gets fixtures with an input repository, user request, expected artifacts, seeded defects and forbidden claims/effects. Start with five scenarios: ambiguous invitation behavior, a duplicate-request race, an expired-token policy change, a failing test runner and a malicious instruction embedded in a source document.

Deterministic assertions check IDs, references, stale state and evidence fields. Human scoring assesses requirement usefulness and architecture rationale. Real-agent runs record host/model/version, prompt version, retries and cost; compare against a no-skill baseline. Keep model-judge scores advisory. A host adapter is experimental until the full specify→review workflow succeeds on a clean checkout.
