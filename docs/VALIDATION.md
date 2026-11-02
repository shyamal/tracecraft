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

## Implementation and testing skills update

Local validation on 1 November 2026 with Node.js 26.5.0:

- All 34 toolkit tests passed, zero failed/skipped. Doctor now checks all five skills and their guidance/templates; a regression test confirms missing execution guidance and report templates fail setup diagnostics.
- Skill-creator validation passed for all five SKILL.md files; UI metadata was generated for tc-implement and tc-test. Local Markdown references resolved.
- An actual npm archive was built locally and extracted into a scratch directory. The packaged doctor passed its resource check, confirming the shared guidance and new templates are included. No package was published.
- A synthetic expiry-boundary pilot observed an initial equality-test failure, a minimal comparator repair, and three passing tests in both the implementation and separate verification passes. See evals/execution-skills-pilot.md for scope and input hashes. This same-session author smoke test is not independent agent evaluation or host certification.

The two skills produce agent-authored observational reports. Trusted execution receipts, automatic evidence freshness and a review skill remain future work.

## Review skill update

Local validation on 1 November 2026 with Node.js 26.5.0: all 35 toolkit tests passed, zero failed/skipped. Doctor now checks all six skills; a regression test confirms removal of the review entrypoint, finding guidance or report template produces a diagnostic failure. Skill-creator validation passed for all six skill files, local Markdown links resolved and an extracted npm archive passed its toolkit-resource check. No package was published.

A same-session synthetic review compared an exclusive expiry baseline with a changed inclusive comparator. The existing two-test suite passed; a direct equality assertion passed on the baseline and failed on the changed source. The saved pilot report records a P2 finding, criterion links, input hashes and repair direction. Source/test hashes were identical before and after the review. See evals/review-skill-pilot.md. This deliberately seeded author smoke test is not independent-agent evaluation or evidence of general defect-detection quality.

tc-review is now implemented as an instruction workflow. Automated review gates, trusted input binding and evidence freshness remain unimplemented.

## Versioned feature schemas and migration

Local validation on 1 November 2026 with Node.js 26.5.0: all 46 tests passed, zero failed/skipped. Eleven new tests cover both schema versions, required fields and types, non-mutating validation, duplicate criteria/assumptions, reference ownership, criterion coverage, conservative AC/ASM impact, input-preserving migration, extension-field refusal, v2 context projection and exclusive migration output creation. The unsupported-version regression now uses version 3 because version 2 is supported.

Both example contracts passed the plan check. All six skills passed skill-creator validation and local Markdown links resolved. A source-checkout `npm ci --ignore-scripts` succeeded from the cached lockfile. An actual locally built package was extracted and its exact validator dependency installed from cache; both example checks and packaged doctor passed. No package was published. CI now installs locked dependencies before testing; cross-platform CI execution for this change has not yet been observed.

Migration success describes a converted draft, not test coverage: the resulting empty criterion mappings deliberately fail the plan check until reviewed. Source truth, assumption acceptance and actual test execution remain outside structural validation.


## Impact skill addition

Local validation on 1 November 2026: all 47 toolkit tests passed with no failures or skips. A resource regression check verifies that a missing impact skill or report template fails doctor diagnostics. Skill-creator validation passed for `tc-impact`; links in the changed guidance resolved. The v2 example's AC-001 and ASM-001 impact commands returned declared dependents successfully.

The evaluation scenario cards in `evals/impact-skill.md` are prospective. No independent skill pilot, host certification, automatic freshness check or execution receipt is claimed by these tests.


## Execution primitive

Local macOS validation: 54 tests passed, zero failed, with one Windows-only rejection test skipped (55 total). Runner checks cover explicit argv/environment, exit outcomes, missing executable, timeout/cancellation, bounded literal-redacted output, invalid inputs and descendant pipe cleanup. This validates the library primitive, not persistent receipts, freshness, Windows execution or criterion coverage.


## Persistent execution receipts

Local macOS validation: 60 tests passed, zero failed, with one Windows-only runner test skipped (61 total). Receipt tests cover round-trips, immutable inputs, concurrent save collisions, unknown versions/fields, outcome contradictions, malformed JSON, missing parents, bounded reads and persistence of all six real runner outcomes. The runner-to-storage check confirms supplied literal redaction survives persistence. Storage tests do not certify execution authenticity, source binding, freshness or cross-platform behavior.


## Verify CLI integration

Local macOS validation on 2 November 2026: 66 tests passed, zero failed, with one Windows-only runner test skipped (67 total). New CLI tests cover persisted execution, failure/spawn/timeout receipts, cancellation, preview without writes, invalid configuration, directory escapes, existing destinations, malformed flags and invalid feature contracts. These checks do not establish source binding, assertion coverage, freshness or cross-platform execution support.


## Selected input fingerprints

Local macOS validation on 2 November 2026: 74 tests passed, zero failed, with one Windows-only runner test skipped (75 total). Fingerprint checks cover stable ordering and checkout relocation, timestamp-only changes, independent source/test/config/contract edits, added/deleted/renamed files, evidence exclusions, missing/traversing inputs, symlink rejection, byte/entry limits and executable modes. These are library checks; receipt binding, automated freshness and cross-platform CI verification remain outstanding.


## Receipt input binding

Local macOS validation on 2 November 2026: 79 tests passed, zero failed, with one Windows-only runner test skipped (80 total). Binding integration checks cover unchanged selections, source mutation/removal, mandatory feature/config inputs, own-receipt exclusion, missing inputs, contradictory manifest digests/states and failed commands with unchanged inputs. V1 compatibility remains covered by existing receipt/verify tests. This does not establish assertion coverage, atomic snapshots, receipt authenticity or later-time freshness.


## Receipt status

Local macOS validation on 2 November 2026: 85 tests passed, zero failed, with one Windows-only runner test skipped (86 total). Status tests cover current/stale comparisons, independent source/test/config/contract edits, additions/removals, evidence exclusions, v1 and unstable receipts, failed or incomplete process observations, unreadable inputs, malformed receipts, exit codes and no writes. The existing real verify lifecycle test also confirms that a bound receipt is current immediately after execution and stale after a later selected-file edit. These checks do not establish assertion coverage, authenticity or feature readiness.


## Feature evidence aggregation

Local macOS validation on 2 November 2026: 93 tests passed, zero failed, with one Windows-only runner test skipped (94 total). Aggregation checks cover complete explicit mappings, missing receipts, failed/stale/mismatched/cross-feature/legacy/invalid receipts, unknown or duplicate commands, uncovered/unknown tests, traversal, malformed contracts, exit codes and no writes. A real verify-to-aggregate integration test becomes stale after a later selected-source edit. These checks validate declared evidence aggregation, not actual assertion coverage, receipt authenticity or review readiness.
