# Tracecraft

**From a requirement to a tested change, with the reasoning still attached.**

Tracecraft is a proposed open-source workflow toolkit for developers using AI coding assistants. It keeps requirements, architecture decisions, implementation tasks, and test plans connected in a repository. The name is provisional; package and trademark availability have not been checked.

This is a working **0.1.0 prototype**, not the complete MVP. It contains three planning skills, reusable templates, a dependency-free local CLI, an example feature contract, tests, and an implementable product and repository plan. No gstack source or prompts were copied.

## Start here

- [Product concept, gstack comparison, architecture and decisions](docs/DESIGN.md)
- [Command and skill specifications](docs/COMMANDS.md)
- [Use the first three skills](docs/SKILLS.md)
- [Phased MVP and repository implementation backlog](docs/ROADMAP.md)
- [Research sources and inspection limits](docs/SOURCES.md)

## Try the prototype

Use Node.js 24 or 26. No package installation, API key, or model call is required.

```sh
node --test
node bin/tracecraft.mjs check examples/invite-member.json
node bin/tracecraft.mjs impact examples/invite-member.json REQ-001
node bin/tracecraft.mjs new feature.json invite-member
```

The example passes structural validation. It is fictional: its test references do **not** prove that an application or passing tests exist. A newly created feature intentionally fails validation until real requirements, decisions, tasks and test cases have been supplied.

`check` validates structure and relationships. `impact` lists transitive dependents of a changed requirement, decision, task or test. `new` creates a draft file without overwriting an existing one. All output is JSON. Exit codes: 0 = command succeeded, 1 = invalid contract, 2 = usage or I/O error.

## Use with an AI assistant today

Ask your assistant to read `skills/tc-specify/SKILL.md` and specify your feature in your application repository. Continue with `skills/tc-architect/SKILL.md`, then `skills/tc-plan/SKILL.md`. The skills create linked requirements, design decisions, implementation tasks and planned tests. See [usage and stage checks](docs/SKILLS.md). The assistant performs the reasoning and edits; the CLI checks the resulting graph. Dedicated host installation and slash commands are **planned**, not installed or certified by this prototype.

The toolkit targets any application language. Its own CLI uses JavaScript ES modules and Node's built-in test runner. The first public MVP should add JSON Schema validation, revision-bound verification records and tested host adapters.

## Status and scope

Implemented: specify/architect/plan skills with templates, stage-specific structural checks, contract creation, reference validation, requirement-to-design/task/test coverage, transitive change impact, and automated CLI/core tests.

Planned: implementation/testing/review skills, host installers, execution receipts, evidence freshness, review gates, context generation, CI integration for consuming projects and a published package. The included CI workflow tests the toolkit itself.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). MIT licensed. Inspired by gstack's workflow approach; independently designed and not affiliated with gstack.
