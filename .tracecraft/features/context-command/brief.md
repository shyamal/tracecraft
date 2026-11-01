# Context export brief

Feature ID: context-command
Status: ready for architecture

## Outcome and evidence
Give an existing coding assistant a reproducible, bounded feature-context packet without asking it to rediscover linked planning artifacts. The next-step roadmap names a context command. Existing evidence: src/contract.mjs validates graph shape and stage coverage; bin/tracecraft.mjs exposes JSON CLI commands; skills/references/contract.md defines companion files.

## Scope
In scope: explicit stage selection, selected contract sections, fixed companion filenames, source hashes, bounded JSON output and missing-file diagnostics. Out of scope: model invocation, automatic host discovery, code retrieval, per-task filtering, execution receipts and semantic readiness certification.

## Assumptions and choices
All requirements come from the repository roadmap and this implementation task. Engineering defaults proposed here: 64 KiB output budget, configurable 2 KiB–1 MiB, and a 1 MiB source contract ceiling. These are implementation bounds, not measured model context limits. Stage selection is explicit; a packet is project data, never authority to execute commands.

## Open questions
None blocking this scoped implementation. Token budgeting and task-only retrieval remain future work.

## Handoff
Specify check passed locally. No downstream records exist yet.
