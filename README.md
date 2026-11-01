# Tracecraft

**From a requirement to a tested change, with the reasoning still attached.**

Tracecraft is a proposed open-source workflow toolkit for developers using AI coding assistants. It keeps requirements, architecture decisions, implementation tasks, and test plans connected in a repository. The name is provisional; package and trademark availability have not been checked.

This is a working **0.1.0 prototype**, not the complete MVP. It contains six workflow skills, reusable templates, a local CLI with versioned JSON Schema validation, example feature contracts, tests, and an implementable product and repository plan. No gstack source or prompts were copied.

## Start here

- [Product concept, gstack comparison, architecture and decisions](docs/DESIGN.md)
- [Command and skill specifications](docs/COMMANDS.md)
- [Use the workflow skills](docs/SKILLS.md)
- [Export context for your assistant](docs/CONTEXT.md)
- [Check your local setup](docs/DOCTOR.md)
- [Feature schema v2 and safe migration](docs/SCHEMA.md)
- [Phased MVP and repository implementation backlog](docs/ROADMAP.md)
- [Research sources and inspection limits](docs/SOURCES.md)

## Try the prototype

Use Node.js 24 or 26. Install the locked validator dependency once from the checkout; no API key or model call is required for CLI operations.

```sh
npm ci --ignore-scripts
node --test
node bin/tracecraft.mjs doctor
node bin/tracecraft.mjs check examples/invite-member.json
node bin/tracecraft.mjs check examples/invite-member-v2.json
node bin/tracecraft.mjs impact examples/invite-member.json REQ-001
node bin/tracecraft.mjs context examples/invite-member.json --stage implement
node bin/tracecraft.mjs new feature.json invite-member
```

The example passes structural validation. It is fictional: its test references do **not** prove that an application or passing tests exist. A newly created feature intentionally fails validation until real requirements, decisions, tasks and test cases have been supplied.

The example contains only the JSON contract, so its context export reports missing companion documents. This is an intentional example of explicit omissions, not an executed-test report.

New drafts use schema v2 with stable acceptance-criterion IDs, requirement sources and assumptions. Existing v1 contracts remain supported. Use `migrate <v1-file> <new-v2-file>` for a non-overwriting conversion; criterion-to-test mappings require manual review afterward.

`check` validates structure and relationships. `impact` lists transitive dependents of a changed requirement, decision, task or test. `new` creates a draft file without overwriting an existing one. All output is JSON. Exit codes: 0 = command succeeded, 1 = invalid contract, 2 = usage or I/O error.

## Use with an AI assistant today

Ask your assistant to read `skills/tc-specify/SKILL.md` and specify your feature in your application repository. Continue with `skills/tc-architect/SKILL.md`, then `skills/tc-plan/SKILL.md`. The skills create linked requirements, design decisions, implementation tasks and planned tests. See [usage and stage checks](docs/SKILLS.md). The assistant performs the reasoning and edits; the CLI checks the resulting graph. Dedicated host installation and slash commands are **planned**, not installed or certified by this prototype.

When ready to code, use `skills/tc-implement/SKILL.md` for a selected task, then `skills/tc-test/SKILL.md` to verify its acceptance criteria. These skills use your assistant's existing coding and command tools. Their reports distinguish observed results from planned tests; the CLI does not yet provide a trusted execution runner.

Finish with `skills/tc-review/SKILL.md` to inspect the selected change against requirements, design and test evidence. Review produces a report with findings and coverage limits; it does not silently repair code or approve a release.

The toolkit targets any application language. Its own CLI uses JavaScript ES modules, Ajv for JSON Schema and Node's built-in test runner. Revision-bound verification records and tested host adapters remain planned.

## Status and scope

Implemented: specify/architect/plan/implement/test/review skills with templates, read-only local setup diagnostics, stage-specific structural checks, bounded context export with source hashes and omission reporting, contract creation, reference validation, requirement-to-design/task/test coverage, transitive change impact, and automated CLI/core tests.

Planned: host installers, trusted execution receipts, evidence freshness, automated review gates, task-specific context filtering, CI integration for consuming projects and a published package. The included CI workflow tests the toolkit itself.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). MIT licensed. Inspired by gstack's workflow approach; independently designed and not affiliated with gstack.
