# Roadmap and delivery status

Status checked on 2 November 2026 through [PR #19](https://github.com/shyamal/tracecraft/pull/19), which is merged. Tracecraft is a working source-checkout prototype. Public beta acceptance is still open; implemented policy gates do not establish independent review, host certification or release approval.

## Delivered implementation

| Area | Available now | Reference |
| --- | --- | --- |
| Requirements and planning | Feature schemas v1/v2, criterion IDs, sources, assumptions, structural stage checks and non-overwriting migration | [Schemas](SCHEMA.md) |
| Assistant workflow | Seven canonical skills with templates: specify, architect, plan, implement, test, review and impact | [Skill usage](SKILLS.md) |
| Local tools | JSON help, feature creation, impact analysis and read-only setup diagnostics | [Commands](COMMANDS.md), [doctor](DOCTOR.md) |
| Context | Bounded planning exports with source hashes and explicit omissions | [Context](CONTEXT.md) |
| Execution | Explicit configured argv, preview, bounded/redacted output, timeout and cancellation on POSIX | [Verify](VERIFY.md), [runner](RUNNER.md) |
| Execution records | Non-overwriting receipt storage, v1 compatibility and optional v2 before/after input binding | [Receipts](RECEIPTS.md) |
| Input freshness | Explicit file/directory fingerprints and read-only per-receipt current/stale checks | [Fingerprints](FINGERPRINTS.md), [status](STATUS.md) |
| Feature evidence | Explicit required-command/test mappings with missing, unusable and stale receipt reporting | [Evidence](EVIDENCE.md) |
| Declared readiness | Separate planning, execution and fingerprint-bound declared-review policy checks | [Readiness](READINESS.md) |
| Review handoff | Bounded planning, selected diff and evidence packets with hashes and omission warnings | [Review packets](REVIEW-PACKET.md) |

Receipts and review records are unsigned. Test mappings are declarations, not proof of executed assertions. Fingerprint scope is explicit and snapshots are not atomic. Windows planning/status tools are covered by CI, but runner/verify execution remains unsupported there.

## Validation completed and still open

| Milestone | Evidence | Remaining acceptance |
| --- | --- | --- |
| Real feature in Tracecraft | [CLI-help pilot](../evals/cli-help-pilot.md): observed failing test, implementation, review finding, stale receipt and re-verification | Independent reader/reviewer and another application |
| Real bug fix in Tracecraft | [Preview-redaction pilot](../evals/preview-redaction-pilot.md): two observed regression failures, shared redactor fix and fresh verification | Independent review and another application |
| Automated toolkit checks | PR #19 passed the [Node 24/26 CI matrix](https://github.com/shyamal/tracecraft/actions/runs/41393015513) on Linux, macOS and Windows; local macOS run: 110 passed, one Windows-only skip | This does not test native assistant installation or unsupported Windows execution |
| Skill workflow | Same-assistant pilots and documented scenario cards | Host/model/version records, independent handoff, comparative baseline and measured costs |

The two real changes above were in the same project and completed by the same assistant. They do not satisfy the two-project or independent-reader criteria. Earlier synthetic exercises remain useful scenarios, not additional real-project pilots.

## Next implementation backlog

1. **Native host trials (installer implemented).** The [project-local installer](ADAPTERS.md) provides both discovery layouts, linked resources, preview, collision checks and conservative uninstall, covered by automated tests. Record actual skill discovery and requirements-through-review invocation in each host on a clean consuming project, with host/model/version and observed limitations. Filesystem tests alone do not establish native workflow compatibility.
2. **Independent handoff and second-application pilot.** Select an application and bounded feature/bug fix with its owner. Have an independent reader resume from persisted artifacts. Record host/model/runtime, actual commands, questions, failures and limits. Acceptance: requirements through review can be followed in two real projects, with current evidence and no unsupported readiness claims. Do not count another Tracecraft change as a second application.
3. **Consumer CI example (implemented; hosted run pending).** The [sample slug application](../examples/consumer-ci/README.md) and pinned-toolkit workflow demonstrate passing, stale, missing, failed and repaired evidence through real CLI calls in a separate temporary project. Local execution is recorded; confirm the hosted workflow after publication. This sample does not satisfy independent review or a production-project pilot.
4. **Windows execution support.** Implement and test process-tree cancellation, timeout and cleanup before enabling runner/verify. Acceptance: zero/nonzero exits, spawn failures, literal argv, bounded output, cancellation and child cleanup work on Windows; unsupported behavior is not silently treated as success.
5. **Public release preparation.** Confirm package name and maintainer identity; establish vulnerability reporting; add a changelog and exact release tags; review archive contents and repeat clean-install smoke tests. Acceptance: documented installation works without the source checkout, native trials are recorded and release limitations are explicit. Keep `private: true` until an intentional publishing step.

## Phase exit criteria

| Phase | Implementation status | Exit criteria still open |
| --- | --- | --- |
| Seed prototype | Delivered | None for the original structural prototype |
| Personal alpha | Core tools and skills implemented; same-assistant feature/bug pilots completed | Independent reader can resume the work |
| Evidence MVP | Runner, receipts, input binding, freshness, aggregation, declared gates and review packets implemented | End-to-end evidence workflow validated in a second real project |
| Public beta | License, source docs and toolkit CI exist | Native host trials, consumer CI example, Windows execution if advertised, packaging/release checks and published pilot results |
| After feedback | Deferred | Prioritize only demonstrated needs |

No phase completion is inferred from passing unit tests alone. Re-estimate remaining effort after host discovery and selection of the second application; earlier implementation estimates are no longer a useful delivery schedule.

## Later improvements

- Task-specific context filtering and finer change-impact analysis.
- Stack recipes and issue/PR integration based on actual adoption needs.
- A helper for structured review records that computes inputs without manufacturing review conclusions.
- Optional browser checks and comparative workflow benchmarks after real use justifies them.

Keep one package until another consumer needs independently versioned APIs. Keep host-specific integration out of graph validation. Automated concurrent writers, global memory, model routing and release automation remain outside the current scope.

## Current adoption layout

```text
consumer-project/
  .tracecraft/config.json                     # explicit local check definitions
  .tracecraft/features/<feature-id>/
    feature.json
    brief.md
    architecture.md
    decisions/ADR-001.md
    plan.md
    evidence.json                            # explicit check/receipt selections
    implementation/TASK-001.md
    verification/<run-id>.md                 # agent-authored observations
    reviews/<review-id>.md                    # narrative assessment
    reviews/<review-id>.json                  # optional declared readiness record
  .tracecraft/local/                          # ignored local receipts/logs/packets
```

Paths are selected by the user; this is a convention, not an automatically created tree. Keep receipts/review outputs out of execution input selections when appropriate and document exclusions. Commit curated contracts, decisions and sanitized summaries; avoid committing raw transcripts, local credentials or machine-specific configuration. The checked-in pilot manifests refer to local evidence that must be regenerated in another checkout.

## Public demonstration still to record

Use an actual selected application, or clearly label a fixture as synthetic. Show requirements → design → scoped implementation → observed regression → repair → current verification → independent review → changed input → stale evidence. Report actual timings, costs and missing observations without a scripted productivity claim. The invitation example remains a fictional planning fixture, not a demonstrated application.
