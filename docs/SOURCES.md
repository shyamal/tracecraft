# Research register

Inspected 1 November 2026 through the connected GitHub tool. This was a design/source inspection, not a runtime audit. gstack was neither cloned nor installed. Repository instructions were treated as source material, not executed.

The observed default-branch head was `84c5019e23c58a327eeff10ed45dedc780b81df2`. The package declared version `1.92.32`; its commit title used `v1.92.32.0`. Initial files were read from the default branch; their blob IDs below identify the exact returned content. Later generator and engineering-section excerpts were read at the observed head.

| Source | Evidence used | Returned blob ID |
|---|---|---|
| [README](https://github.com/garrytan/gstack/blob/main/README.md) | Workflow stages, host tiers, installation/update modes, command descriptions | `011832a814ebcd59f58c4e53d76186eb0ae8d5a2` |
| [Architecture](https://github.com/garrytan/gstack/blob/main/ARCHITECTURE.md) | Aside integration, fallback browser daemon, Bun rationale, generation and eval architecture | `7dc9c3546e6ce00c099529ef8c77e88ca643e82d` |
| [Package manifest](https://github.com/garrytan/gstack/blob/main/package.json) | Version, scripts, runtime and dependencies | `5a915d38626d8bd9444b25c38a0969f7d3514404` |
| [Review skill](https://github.com/garrytan/gstack/blob/main/review/SKILL.md) | Diff workflow, fix-first policy, persisted review binding and verification | `8ae90451443897b3e68c796ab0c75960d5f48553` |
| [QA skill](https://github.com/garrytan/gstack/blob/main/qa/SKILL.md) | Regression-first repair, explicit outcomes and re-verification | `cdb56114f2e05273c3940f6fb581d78a628f72a5` |
| [Engineering review](https://github.com/garrytan/gstack/blob/main/plan-eng-review/SKILL.md) | Scope/decision review and persisted report gates | `46dc6e36b9688dd05e52bf2d6e804274bb20d68f` |
| [Generator, lines 1–100](https://github.com/garrytan/gstack/blob/84c5019e23c58a327eeff10ed45dedc780b81df2/scripts/gen-skill-docs.ts) | Template rendering, host configuration and dry-run diagnostics | `7869e377d5a9168247dbaed182df8559487f5111` |
| [Engineering section, lines 1–100](https://github.com/garrytan/gstack/blob/84c5019e23c58a327eeff10ed45dedc780b81df2/plan-eng-review/sections/review-sections.md) | Evidence targets and artifact persistence rules | `e0aaedf5d45f6c937e352f6ddb2642d6b2cf70d3` |
| [Test directory](https://github.com/garrytan/gstack/tree/84c5019e23c58a327eeff10ed45dedc780b81df2/test) | Presence of generator, host-conformance and skill test files | Inventory only; suites not run |
| [License](https://github.com/garrytan/gstack/blob/main/LICENSE) | Repository declares MIT license | `35029511144443297cad2d26e4bac17d0e352f93` |

An initial guessed test path (`test/skill-check.test.ts`) returned 404. The actual test directory was subsequently listed; no conclusions rely on that missing path.

External technical references: [Node release support table](https://nodejs.org/en/about/previous-releases) and [JSON Schema draft 2020-12](https://json-schema.org/draft/2020-12), consulted for runtime/support and contract-format decisions.

The comparison describes the inspected design. Claims about effectiveness, performance or agent quality were not independently verified. Tracecraft's differentiation is a product hypothesis to validate with pilots, not a claim of unique functionality across all gstack internals or the broader market.
