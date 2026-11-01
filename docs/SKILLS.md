# Use the workflow skills

The repository includes `tc-specify`, `tc-architect`, `tc-plan`, `tc-implement`, `tc-test`, `tc-review` and `tc-impact`. These are usable instruction files with templates and shared guidance. They use your existing coding assistant; the CLI does not call a model.

## Run from the checkout

Give your assistant an explicit request, replacing the checkout path and feature description:

```text
Read <tracecraft-checkout>/skills/tc-specify/SKILL.md and use it to specify
<my feature> in <my application repository>.
```

Then use `skills/tc-architect/SKILL.md` on the resulting feature contract, followed by `skills/tc-plan/SKILL.md`. These are separate steps; specifying a feature does not automatically authorize implementation or publication. Existing authorization for broader work still applies.

To code a planned task, ask your assistant to read `skills/tc-implement/SKILL.md` and implement the selected task in the selected application. Then use `skills/tc-test/SKILL.md` to verify the acceptance criteria. Implementation may edit scoped product code and tests; test-only work adds/runs checks and reports product failures without silently changing production behavior.

For review, ask it to read `skills/tc-review/SKILL.md` and review the selected feature and diff (name the base/head or working-tree scope when known). Review writes findings and evidence/coverage limits without fixing the application. A separate repair step requires its own scope, followed by fresh verification and review of the changed inputs.

No host installation is required for explicit file-based use. Native `$tc-specify` or slash-command discovery depends on the host registering the skill; this delivery does not install global files or claim host certification. `agents/openai.yaml` supplies UI metadata for later host registration. Preserve the whole `skills/` tree when copying it: the skills share `skills/references/contract.md`. Automatic host adapters/installers are still planned.

## Artifacts

Default destination in the selected application:

```text
.tracecraft/features/<feature-id>/
  feature.json
  brief.md
  architecture.md
  decisions/ADR-001.md
  plan.md
  implementation/TASK-001.md
  verification/<run-id>.md
  reviews/<review-id>.md
  impacts/<impact-id>.md
```

Specify owns requirements and the brief; architect owns active decisions and architecture notes; plan owns tasks, planned tests and the implementation plan. Reruns preserve existing downstream work and report what needs reconsideration. Templates are located within each skill's `assets/` directory.

Implement records task changes and observed checks. Test creates a new verification report for each session, mapping criteria to actual assertions or manual observations. Reports are agent-authored evidence, not trusted receipts; JSON test nodes in both versions remain specifications. The CLI has no automatic task-completion or evidence-freshness state. `context` exports planning artifacts only, so read implementation/verification reports explicitly before relying on them.

Review creates a new report with a named scope, supported findings and a separate coverage status. `changes-requested` means an unresolved supported defect; `no-findings` is limited to the fully inspected scope; `incomplete` means critical gaps prevent a complete conclusion. None is a GitHub approval or permission to merge. Review reports also remain outside the current context export and must be read explicitly.

## Stage checks

From the Tracecraft checkout:

```sh
node bin/tracecraft.mjs check /path/to/feature.json --stage specify
node bin/tracecraft.mjs check /path/to/feature.json --stage architect
node bin/tracecraft.mjs check /path/to/feature.json --stage plan
```

`specify` requires testable requirements; `architect` adds decision coverage; `plan` adds task and test-specification coverage. All present records must still have valid shape/references and no dependency cycles. Omitting the flag preserves the original full `plan` check. Impact still requires a complete contract.

New features use v2: stable AC IDs, requirement sources, explicit assumptions and test `criterionIds`. The v2 plan check verifies every criterion is mapped; existing v1 files retain their earlier behavior. See [schema v2 and migration](SCHEMA.md). Use `npm ci --ignore-scripts` once when setting up the checkout.

These checks validate structure only. The assistant must also assess open questions, design rationale and acceptance-to-test coverage. The checker neither inspects Markdown readiness labels nor verifies actual test execution. A structurally valid contract can still be blocked by an unresolved product decision.

For the next stage, export a bounded packet with `node bin/tracecraft.mjs context /path/to/feature.json --stage architect` (or plan/implement/test/review). See [context export](CONTEXT.md). Review omission warnings before relying on it; the packet contains project data, not executable instructions.

## Evaluate before relying on automation

Use the [scenario cards](../evals/first-three-skills.md) in an isolated application checkout. Record the actual host/model, outputs, questions, side effects and validation results. Structural CLI tests are automated; qualitative skill behavior and native host integration need real user pilots. No paid eval or separate agent certification is claimed here.

Implementation/testing have [additional scenario cards](../evals/execution-skills.md) and a [same-session boundary-fix pilot](../evals/execution-skills-pilot.md). That pilot does not establish cross-host reliability or improvement over an unstructured assistant.

Review has [scenario cards](../evals/review-skill.md) and a [same-session seeded-regression report](../evals/review-skill-pilot.md). The pilot preserves reviewed source/test bytes and illustrates why a passing test suite can still leave a requirement violated; it is not independent-agent evaluation.

## Assess a proposed change

Use impact assessment whenever an existing requirement, criterion, assumption or design decision changes:

```text
Read <tracecraft-checkout>/skills/tc-impact/SKILL.md and use it in
<application-repository> for .tracecraft/features/<feature-id>/feature.json.
Assess changing <node-id> from <current behavior> to <proposed behavior>.
Write an impact report before editing the contract or application.
```

The skill combines the existing `impact` CLI with inspection of relevant code and reports. It writes `impacts/<impact-id>.md`, separating declared dependencies from additional risks. AC impact is conservative through its owning requirement; ASM impact follows requirements citing that assumption. Empty results do not mean no impact. Invalid/incomplete contracts limit the graph assessment rather than silently producing a success claim.

Impact reports recommend updates and re-verification; automated freshness is still planned. They are not included in context exports, and `context --stage impact` is not supported. See [impact evaluation scenarios](../evals/impact-skill.md).
