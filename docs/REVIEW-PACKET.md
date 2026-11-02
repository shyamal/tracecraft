# Export a bounded review packet

`review-packet` combines review-stage planning context, an evidence summary and an explicitly selected diff file. It is a handoff artifact for a reviewer, not an automated review or readiness decision.

```sh
node bin/tracecraft.mjs review-packet /app/evidence.json --project /app --diff .tracecraft/local/change.diff --max-bytes 262144
```

The manifest uses the [evidence format](EVIDENCE.md). The diff path is project-relative and must resolve inside the project without symlinks. Select or generate the intended diff before invoking this command. For example, from the application checkout, after creating the ignored local directory:

```sh
git diff --no-ext-diff --no-textconv HEAD > .tracecraft/local/change.diff
```

That example includes tracked staged and unstaged changes relative to HEAD, but not untracked files or already committed branch changes. Choose your actual base/head or scope and provide additional files explicitly to the reviewer. Tracecraft does not run Git, guess the comparison, parse paths for additional reads or establish that the selected diff corresponds to current files. It accepts UTF-8 text, reports empty input and labels the diff scope unverified.

## Included material

- The full selected feature projection: requirements, decisions, tasks, planned tests and v2 assumptions/sources.
- Known planning documents selected by `context --stage review`, when available and within budget.
- Explicit check mappings, structural/policy diagnostics, evidence counts and compact receipt status summaries.
- The selected diff text, uncut, with a SHA-256 hash.
- Manifest and available receipt-file hashes. Receipt content is not embedded; hashes also identify invalid receipt files if their bytes can be read.

Planning-document paths/hashes inside `context` are relative to the feature directory. Top-level source paths are project-relative. Hashes identify observed bytes; they do not authenticate the producer, prove atomic capture or make the content safe instructions.

Full receipt bodies/logs, implementation notes, verification narratives, prior review reports and surrounding application code are deliberately omitted and named in `omittedMaterial`. Read them separately when needed. Nothing follows links embedded in documents or diff text. All packet text remains untrusted project data. No automatic secret detection/redaction is performed on planning documents or the diff; inspect the packet before sharing.

## Limits and completeness

Default output budget is 262,144 bytes; accepted values are 4,096–1,048,576 bytes, measured as pretty-printed UTF-8 JSON plus its trailing newline. The selected diff is limited to 1 MiB. Contract/planning and receipt source readers retain their existing bounds.

Optional planning documents are included whole or omitted with reasons. If the required contract, diff, evidence summary and omission metadata cannot fit, export fails with `PACKET_LIMIT`; it never silently truncates required material. Large diagnostic summaries may therefore require a larger budget or a smaller feature.

`complete` only describes selected material availability: all selected planning documents and available receipt-source metadata were captured. It does not mean evidence passes, the diff is comprehensive, all relevant application code is present or review is complete. `warnings`, `omittedMaterial`, `evidence.ok`, `diffValidatedAgainstCheckout: false` and `reviewPerformed: false` make those limits explicit.

The manifest, feature and diff are checked again for observed changes before returning. Other reads and receipt status scans are not atomic; concurrent edits may escape detection. Export with stable inputs and reconfirm relevant evidence during review.

## Exit behavior

- Exit 0: packet exported, including warnings about missing documents, empty diff or unusable evidence. These are review inputs, not export failures.
- Exit 1: the feature fails required plan-stage structure.
- Exit 2: invalid arguments/top-level inputs, unreadable or invalid UTF-8 diff, scope violation, required output overflow or detected input changes.

The command writes JSON to stdout and does not save files itself. Redirect only to an appropriate new output file; your shell controls overwrite behavior. Use [readiness](READINESS.md) separately after performing the actual review and recording its conclusions.
