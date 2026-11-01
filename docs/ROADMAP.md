# Phased MVP and repository plan

Estimates assume one developer familiar with JavaScript and AI coding tools, working focused days. They are planning ranges, not delivery promises.

| Phase | Scope | Exit criteria | Estimate |
|---|---|---|---|
| 0 — seed (this delivery) | Concept, specs, graph validator, impact CLI, fixture and tests | Run local checks and demonstrate transitive impact; clearly label unavailable capabilities | Delivered as prototype |
| 1 — usable personal alpha | JSON Schema, richer requirement/ADR/task templates, five core skill files, manual host use, `context` and `doctor` | Complete one real feature and one bug fix; independent reader can resume work | 4–7 days |
| 2 — evidence MVP | Safe command runner, receipts, input hashes, freshness, stage gates, review packet | Mutated requirement/code/test invalidates affected evidence; failed/blocked checks never pass; workflow succeeds in two real projects | 5–8 days |
| 3 — public beta | Codex/Claude adapters, installer dry-run/uninstall, CI consuming-project example, docs, license/release checks | Clean checkout on macOS/Linux/Windows; two hosts complete workflow; pilot benchmark published | 4–7 days |
| 4 — after feedback | Precise impact, stack recipes, issue/PR integrations, optional browser checks | Add only capabilities shown to improve pilot outcomes | Demand driven |

Public MVP = phases 1–3. Do not position phase 0 as an autonomous engineering agent.

Current progress: six skills and templates, stage checks, bounded context exports, local doctor diagnostics and v1/v2 JSON Schema validation with non-overwriting migration are implemented. V2 adds stable criteria, sources and assumptions. Independent real-project pilots remain outstanding; same-session synthetic exercises are not host certification. Trusted execution receipts, freshness and host/configuration integration are still planned. See [schema and migration](SCHEMA.md), [skill usage](SKILLS.md), [context export](CONTEXT.md) and [setup diagnostics](DOCTOR.md).

## Current repository

```text
tracecraft/
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
  package.json                  # private until release readiness
  bin/tracecraft.mjs             # argument and filesystem boundary
  src/contract.mjs               # pure graph/validation functions
  test/contract.test.mjs         # behavior and CLI failure cases
  examples/invite-member.json    # fictional contract, no run claims
  docs/DESIGN.md
  docs/COMMANDS.md
  docs/ROADMAP.md
  docs/SOURCES.md
  .github/workflows/test.yml     # toolkit tests, not product verification
```

## Add in implementation order

1. **Schema and migration PR** — `schemas/feature.schema.json`, `schemas/receipt.schema.json`, `src/schema.mjs`, `test/fixtures/invalid/`. Add criterion IDs, assumptions and sources. Unknown versions fail closed. Keep graph checks separate from shape checks. Acceptance: malformed/duplicate/orphan/cyclic fixtures fail, valid fixtures survive a save/load cycle.
2. **Artifact and context PR** — `templates/{brief,architecture,adr,review}.md`, `src/context.mjs`. Stable selection by stage and linked IDs. Acceptance: no unrelated client/project context included; missing files and truncation are explicit.
3. **Skill PR** — `skills/tc-{specify,architect,plan,implement,test,review,impact}/SKILL.md`, `evals/scenarios/`, `evals/rubric.md`. Acceptance: at least one manual end-to-end run and benchmark baseline; no host certification implied by prompt syntax.
4. **Execution PR** — `src/runner.mjs`, `src/receipts.mjs`. Selected argv commands, timeouts, bounded/redacted logs, failure receipts, controlled cwd, cancellation and child-process cleanup. Acceptance: exit-zero, exit-nonzero, timeout, missing executable and hostile argv tests; no commands derived from arbitrary prose.
5. **Freshness and gates PR** — `src/fingerprint.mjs`, `src/policy.mjs`, `src/status.mjs`. Hash source/config/contract; retain history; distinguish self-report from observed execution. Acceptance: dirty worktree and changed tests invalidate evidence; changing receipt files alone does not.
6. **Host adapters PR** — `adapters/{codex,claude}/`, `src/install.mjs`. Render capability metadata from canonical skills; collision detection; owned-file manifest; dry-run and uninstall. Acceptance: idempotent installation, no global overwrites, no hidden hooks, real workflow on each host.
7. **Distribution PR** — package name validation, explicit author/maintainer identity, lockfile if dependencies added, exact release tags, changelog, npm pack smoke test and clean-install guide. Remove `private: true` only for an intentional release. Acceptance: published tarball contents reviewed; install/run works without the source checkout.

Keep work in one package. Introduce `packages/core` and `packages/cli` only when another consumer needs independently versioned APIs. Host-specific integration should not leak into graph validation.

## Project adoption layout (planned)

```text
consumer-project/
  .tracecraft/config.json                 # version + chosen check commands
  .tracecraft/features/<slug>/feature.json
  .tracecraft/features/<slug>/brief.md
  .tracecraft/features/<slug>/architecture.md
  .tracecraft/features/<slug>/decisions/ADR-001.md
  .tracecraft/features/<slug>/reviews/<id>.json
  .tracecraft/features/<slug>/verification/<id>.json
  .tracecraft/local/                      # ignored raw logs and temporary state
```

Commit curated contracts, decisions and sanitized summaries. Avoid committing raw transcripts by default. Use stable feature IDs, not branch names, so artifacts survive rebases. Handle conflicts with Git and explicit resolution; never last-writer-wins shared JSON. Automated multi-writer support is deferred.

## First public demo

Use a small invitation API fixture with an intentionally seeded authorization or expiry bug. Show: specify → architecture choice → implementation task → observed failing regression → fix → passing run → independent review → requirement change → stale evidence. Include actual timings and costs, not a scripted claim of productivity. The invitation contract in this prototype is the planning seed for that demo, not the demo application.
