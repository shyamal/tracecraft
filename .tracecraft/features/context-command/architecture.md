# Context export architecture

Feature ID: context-command
Status: ready for planning

## Existing components and proposed boundaries
Reuse validate() for all present graph nodes and stage prerequisites. Add src/context.mjs for stage selection, bounded file loading, provenance and packet construction. Keep argument validation/output in bin/tracecraft.mjs. No model, process runner or new dependency.

## Selection policy
specify: requirements + brief.md, checked at specify level.
architect: requirements/decisions + brief.md, architecture.md, active ADR notes, checked at specify level.
plan: all contract groups + brief.md, architecture.md, active ADR notes, plan.md, checked at architect level (existing tasks/tests preserve planning context).
implement/test/review: all groups and the same documents, checked at plan level.

## Error and trust boundary
Required contract failure stops export: malformed JSON, invalid graph, unavailable file or input over 1 MiB. Fixed optional document paths stay under the feature directory after realpath resolution. They are read as bounded regular files; no globbing, recursive link following or command execution. Missing/unavailable/oversized files are explicit omissions. File changes during a run are not a transactional snapshot; hashes describe the bytes read. This is not a hostile-filesystem sandbox.

## Budget
Default total serialized output limit 65536 UTF-8 bytes; accepted range 2048–1048576. Required contract projection plus metadata must fit. Add complete documents in stable order only when they fit, with an omission reason otherwise. Never truncate text. If even required metadata and omission records exceed the budget, return an error instead of a partial packet. Byte budget is not a token estimate.

## Decisions and verification
ADR-001 explains alternatives. Test selection, stage prerequisites, deterministic hashes, missing documents, oversized Unicode content, path isolation, invalid options and preserved CLI behavior. No unresolved design blockers for this local implementation.
