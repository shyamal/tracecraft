# Sample consumer: label-to-slug CLI

This small dependency-free application converts labels such as `Café / Release 42!` to `cafe-release-42`. It demonstrates real test execution and evidence checks in a disposable consumer project, separate from the toolkit source tree. It is a sample, not an independently reviewed production-project pilot or a native assistant trial.

## Run the application

From the Tracecraft checkout, with Node 24 or newer:

```sh
node examples/consumer-ci/app/src/cli.mjs "Café / Release 42!"
node --test examples/consumer-ci/app/test/slug.test.mjs
```

The CLI requires one argument. It lowercases text, decomposes combining accents, collapses non-ASCII-alphanumeric runs into hyphens, and trims separators. Empty results are errors. This is deliberately an ASCII-only utility, not a general transliteration or uniqueness service.

## Run the evidence demonstration

Prepare the toolkit dependencies using `npm ci --ignore-scripts`, then run:

```sh
node examples/consumer-ci/run-ci.mjs --toolkit .
```

POSIX only: Tracecraft verify execution does not yet support Windows. The application itself is portable. The harness copies `app/` into an OS temporary directory, writes local configuration with the current absolute Node executable, runs the toolkit's public CLI, and removes the copy in `finally`. It never changes the source application. No dependency installation, network access or AI call occurs in the harness.

| Scenario | Required result |
| --- | --- |
| Plan validation and verify preview | Exit 0 |
| Passing tests and selected receipt | Verify and evidence exit 0 |
| Change selected source after verification | Evidence exit 1 with stale freshness |
| Delete the selected receipt | Evidence exit 1 with one missing receipt |
| Introduce a real bug and rerun tests | Verify exit 1; evidence exit 1 despite current inputs |
| Restore source and rerun tests | Verify and evidence exit 0 |

The harness exits zero only when **all** expected outcomes are observed. An unexpected success or error fails it. Expected failures are assertions for this demonstration; do not copy the deliberate source mutations or expected-failure handling into a production gate.

The command fingerprints `src/`, `test/`, and the automatically included feature/config files. Receipts are outside that selection. The evidence manifest maps the configured command to declared `TEST-001`; this mapping is not proof of assertion coverage. Evidence checks do not establish review approval or authenticate receipts. There is no no-findings review record in this example.

## Pinned CI example

The repository's [consumer example workflow](../../.github/workflows/consumer-example.yml) checks out this consumer independently from a toolkit checkout at immutable commit `49c625c8de51a3e714f978c9f7779f81dfd31afc`. It installs the toolkit's locked dependencies and runs the same harness. The workflow has read-only repository permissions, disables persisted checkout credentials and uploads no raw receipts/logs. It runs on pull requests using `pull_request`, not `pull_request_target`.

To reproduce the pinned toolkit locally, clone into a new directory and select the exact commit:

```sh
git clone https://github.com/shyamal/tracecraft.git /absolute/new/path/tracecraft-pinned
git -C /absolute/new/path/tracecraft-pinned checkout --detach 49c625c8de51a3e714f978c9f7779f81dfd31afc
npm ci --ignore-scripts --prefix /absolute/new/path/tracecraft-pinned
node examples/consumer-ci/run-ci.mjs --toolkit /absolute/new/path/tracecraft-pinned
```

Replace the paths first. Dependency installation needs registry access or a populated npm cache. GitHub Actions still uses the repository's existing major-version action references; only the toolkit source revision is pinned to a commit here. Review dependency and action updates separately.

For a standalone demonstration repository, copy this directory to `examples/consumer-ci/` and copy the linked workflow to `.github/workflows/consumer-example.yml`. The sample has no package dependencies; only the separate toolkit needs installation.

For your own application, replace the sample tests, feature criteria and evidence mapping with real ones. Generate explicit argv/env/input configuration for your runner. Run `verify` followed by `evidence` as ordinary failing CI steps, using a new receipt location per execution. Do not reuse success receipts after source changes or treat this demonstration as a complete application workflow.

## Recorded validation

Local runs on 2 November 2026 exercised all ten observations against both the current toolkit and the exact pinned commit. The stale, missing and failing-test cases returned exit 1; repair returned usable evidence. The generated GitHub workflow has not yet run on GitHub. Native host discovery, independent handoff and a full second-application requirements-through-review pilot remain open.
