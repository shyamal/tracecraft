# Tracecraft

**From a requirement to a tested change, with the reasoning still attached.**

Tracecraft is a proposed open-source workflow toolkit for developers using AI coding assistants. It keeps requirements, architecture decisions, implementation tasks, and test plans connected in a repository. The name is provisional; package and trademark availability have not been checked.

This is a working **0.1.0 prototype**, not the complete MVP. It contains seven workflow skills, reusable templates, a local CLI with versioned JSON Schema validation, example feature contracts, tests, and an implementable product and repository plan. No gstack source or prompts were copied.

## Start here

- [Product concept, gstack comparison, architecture and decisions](docs/DESIGN.md)
- [Command and skill specifications](docs/COMMANDS.md)
- [Use the workflow skills](docs/SKILLS.md)
- [Export context for your assistant](docs/CONTEXT.md)
- [Check your local setup](docs/DOCTOR.md)
- [Experimental execution library and limits](docs/RUNNER.md)
- [Save and validate execution receipts](docs/RECEIPTS.md)
- [Run a configured check with verify](docs/VERIFY.md)
- [Fingerprint selected verification inputs](docs/FINGERPRINTS.md)
- [Check whether a receipt is still current](docs/STATUS.md)
- [Aggregate required checks for a feature](docs/EVIDENCE.md)
- [Evaluate planning, execution and declared review readiness](docs/READINESS.md)
- [Export a bounded review packet](docs/REVIEW-PACKET.md)
- [Feature schema v2 and safe migration](docs/SCHEMA.md)
- [Phased MVP and repository implementation backlog](docs/ROADMAP.md)
- [Research sources and inspection limits](docs/SOURCES.md)

## Try the prototype

Use Node.js 24 or 26. Clone the toolkit and install its locked validator dependency; the planning commands need no API key or model call. Configured verification commands use whatever services their selected executable requires.

```sh
git clone https://github.com/shyamal/tracecraft.git
cd tracecraft
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

Open your application repository in your coding assistant, such as Codex or Claude Code, and give it the explicit file-based prompts below. It needs access to both the application and the Tracecraft checkout. Keep the whole `skills/` directory together because the skills share reference files.

The assistant performs reasoning, edits and test execution using its existing tools. The CLI validates contracts and exports context. Dedicated host installers and native slash commands are planned; this prototype does not register skills or certify host integration.

## Your first feature

Start with a small change in an existing application. The example below uses member invitations; replace it with your own feature. Replace `<toolkit>` and `<app>` with absolute checkout paths in every prompt. Send each prompt separately and review the resulting artifacts before continuing.

### 1. Specify the requirement

```text
Read <toolkit>/skills/tc-specify/SKILL.md and use it in <app>.
Specify invite-member: allow a workspace administrator to invite a member
by email. Inspect the existing application and ask about unresolved behavior.
Save the feature under .tracecraft/features/invite-member/.
```

This creates `feature.json` and `brief.md` in your application. Resolve important questions about permissions, expiration and duplicate invitations before design. New contracts use schema v2 with requirement sources, assumptions and stable acceptance-criterion IDs.

### 2. Design the change

```text
Read <toolkit>/skills/tc-architect/SKILL.md and use it in <app>
for .tracecraft/features/invite-member/feature.json.
Propose a design that fits the existing application and record the decisions.
```

Review `architecture.md` and the notes in `decisions/`. Check the design against the requirements and resolve consequential assumptions.

### 3. Plan implementation and tests

```text
Read <toolkit>/skills/tc-plan/SKILL.md and use it in <app>
for .tracecraft/features/invite-member/feature.json.
Break the design into scoped tasks and map planned tests to acceptance criteria.
```

Review `plan.md` and select a task whose dependencies are ready. After each of these first three stages, run the matching structural check from the Tracecraft checkout, replacing `<app>` with your application path:

```sh
node bin/tracecraft.mjs check <app>/.tracecraft/features/invite-member/feature.json --stage specify
node bin/tracecraft.mjs check <app>/.tracecraft/features/invite-member/feature.json --stage architect
node bin/tracecraft.mjs check <app>/.tracecraft/features/invite-member/feature.json --stage plan
```

A passing check confirms structure and declared coverage. It does not resolve product questions or prove tests have run.

### 4. Implement one task

Replace `TASK-001` below with the selected task ID from your plan.

```text
Read <toolkit>/skills/tc-implement/SKILL.md and use it in <app>
to implement TASK-001 from .tracecraft/features/invite-member/feature.json.
Add appropriate tests and record the changes and observed checks.
```

The assistant edits scoped application code and tests and records work in `implementation/TASK-001.md` within the feature directory.

### 5. Verify the behavior

```text
Read <toolkit>/skills/tc-test/SKILL.md and use it in <app>
for TASK-001 in .tracecraft/features/invite-member/feature.json.
Inspect the actual assertions, run relevant checks and create a new verification
report. Identify failed, blocked or untested criteria explicitly.
```

Read the new report in `verification/`. Planned test nodes are not execution evidence, and assistant-written reports are not trusted execution receipts. Repeat implementation and verification for the remaining tasks.

### 6. Review the change

```text
Read <toolkit>/skills/tc-review/SKILL.md and use it in <app>
for .tracecraft/features/invite-member/feature.json.
Review the current uncommitted changes, including relevant untracked files,
against the requirements, design and verification reports.
Write findings and coverage limits to a new review report.
```

If you have already committed the work, replace the uncommitted-change scope with your actual base and head revisions. Read the report in `reviews/`; resolve findings and rerun affected verification before requesting another review. A review report does not approve a release or merge a pull request.

For longer sessions, the `context` command exports a bounded packet of planning artifacts. It reports omissions and does **not** include implementation, verification or review reports; read those files explicitly. See the [full skill guide](docs/SKILLS.md) and [context guide](docs/CONTEXT.md).

The toolkit targets any application language. Its own CLI uses JavaScript ES modules, Ajv for JSON Schema and Node's built-in test runner. Revision-bound verification records and tested host adapters remain planned.

## Assess changes to an existing feature

Use `skills/tc-impact/SKILL.md` with a feature contract, changed node ID and proposed behavior. It combines declared graph dependencies with code inspection and writes an impact report recommending updates and re-verification. It does not change the contract or application. See [usage and limitations](docs/SKILLS.md#assess-a-proposed-change).

## Status and scope

| Capability | Available today | Planned |
| --- | --- | --- |
| Workflow | Seven file-based skills and reusable templates | Tested host adapters and installers |
| Contracts | v2 sources, assumptions and criterion IDs; v1 support; non-overwriting migration | Further workflow automation |
| Validation | Structural stage checks, references and declared coverage | Evidence freshness and automated review gates |
| Context | Bounded planning packets, source hashes and explicit omissions | Task-specific filtering |
| Change impact | Transitive dependencies from the declared contract | — |
| Verification | Configured POSIX checks, dry-run previews and versioned receipts | Real-project readiness pilots |
| Review handoff | Bounded planning, diff and evidence packet with hashes and omissions | Real-project review pilots |
| Readiness | Separate planning, execution and declared-review gates | Real-project pilots and review-quality evaluation |
| Feature evidence | Explicit required checks, receipt matching and missing/stale summaries | Independent assertion/review evaluation |
| Input fingerprints | Selected-file SHA-256, evidence exclusions and receipt status checks | Real-project readiness pilots |
| Local setup | Read-only `doctor` diagnostics | Published package |
| CI | Automated tests for the toolkit itself | Integration for consuming applications |

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). MIT licensed. Inspired by gstack's workflow approach; independently designed and not affiliated with gstack.
