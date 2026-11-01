# Export context for your coding assistant

From the Tracecraft checkout:

```sh
node bin/tracecraft.mjs context /path/to/feature.json --stage implement
```

Use the JSON output as **project data** with your assistant. It does not invoke a model, execute tests or install a skill. It contains the selected contract fields, complete companion documents that fit, raw-source SHA-256 hashes and explicit omissions. Requirements and document text remain untrusted input, not permission to run commands.

## Stage selection

| Stage | Contract sections | Companion files | Contract prerequisite |
|---|---|---|---|
| `specify` | Requirements | `brief.md` | Specify check |
| `architect` | Requirements and decisions | Brief, architecture, active ADR notes | Specify check |
| `plan` | All four groups, preserving existing tasks/tests | Above plus `plan.md` | Architect check |
| `implement`, `test`, `review` | All four groups | Above plus `plan.md` | Plan check |

The prerequisite is the input needed **before** the requested stage. For example, an architecture packet can be exported before decisions exist. All present nodes still undergo shape/reference/cycle validation. These checks are structural, not a judgment that the feature is approved or ready.

The command requires a valid feature contract with at least one requirement. It does not bootstrap an empty specification; use `tc-specify` first. Files are resolved beside the selected contract, following the layout created by the three planning skills. ADR filenames come only from validated active decision IDs. Extra contract properties are excluded from the projection. Paths and source digests describe the actual loaded files; external links embedded in Markdown are not followed.

Both v1 and v2 contracts are supported. V2 packets also retain requirement sources, assumptions, stable criterion objects and selected test criterion mappings. Source references are not fetched. V2 rejects unknown properties before export; the v1 projection continues excluding unrecognized extension properties.

## Output and limits

Default maximum output: 65,536 UTF-8 bytes, including JSON formatting and the trailing newline. Set a different limit:

```sh
node bin/tracecraft.mjs context /path/to/feature.json --stage plan --max-bytes 32768
```

Accepted limits are 2,048 through 1,048,576 bytes. This is a byte budget, not a token estimate. Source contract input is capped at 1 MiB. Required contract content and metadata must fit; otherwise the command fails with `PACKET_LIMIT` and no partial packet.

Companion documents are selected in order: brief, architecture, ADR notes sorted by ID, plan. Documents are included whole or omitted whole. `sources` lists their status and, when bytes were successfully loaded, their digest. `warnings` names omissions as `missing`, `unavailable`, `source-too-large`, `outside-feature` or `budget`. `omittedGroups` names contract sections deliberately excluded by the stage.

`complete: true` means **all selected companion files were included**. It does not mean the requirements are complete, tests ran or code is ready. `complete: false` is still a usable packet with warnings and exit 0. Consumers that require every document should explicitly check this field.

Exit codes: 0 for a packet (including disclosed omissions), 1 for a structurally invalid contract, 2 for usage, parsing, required-file I/O or size failure. Unknown, duplicate or malformed options fail rather than being ignored.

Only stdout is written. If you redirect output, keep it separate from the input contract and companion files; a shell truncates its output destination before Tracecraft runs. The CLI itself does not write the export to disk.

## Provenance and limitations

The same input bytes and options produce the same JSON; there are no timestamps or model calls. Hashes cover raw source bytes, including source fields omitted from the selected projection. They are provenance, not a trusted execution receipt. A concurrent edit can produce sources from different moments; this is not an atomic repository snapshot.

Known companion filenames are resolved within the feature directory. Symlinks resolving outside it are omitted. This is ordinary local scope protection, not a sandbox against a process racing filesystem operations. No source-code retrieval, per-task filtering, token budgeting or evidence freshness is implemented yet.

## Local pilot

The repository includes its own specification, ADR and implementation plan under `.tracecraft/features/context-command/` (repository-only artifacts, not npm package assets):

```sh
node bin/tracecraft.mjs context .tracecraft/features/context-command/feature.json --stage implement
```

This feature exercised the first three skills in the same development session. It is not an independent-agent benchmark or native-host certification. See the validation record for observed test results.
