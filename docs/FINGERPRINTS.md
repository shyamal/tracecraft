# Selected input fingerprints

`fingerprintInputs` in `src/fingerprint.mjs` hashes selected on-disk inputs without requiring Git. It detects dirty and untracked changes within the selected scope. Verify now uses this library for optional [receipt input binding](VERIFY.md#bind-selected-inputs). No status command or later-time freshness gate exists yet.

```js
import { fingerprintInputs } from './src/fingerprint.mjs';

const snapshot = await fingerprintInputs('/absolute/path/to/application', {
  paths: ['src', 'test', 'package.json', 'package-lock.json',
    '.tracecraft/config.json', '.tracecraft/features/invite-member/feature.json'],
  exclude: [],
});
```

Select actual files and directories in your application; a missing selection fails. Add tool configuration and other inputs relevant to the command. Selection paths must be relative to the project, without traversal, drive prefixes or backslashes. Directories are traversed recursively. Symlinks, including selected paths below linked directories, and non-regular files are rejected. The project root itself is resolved once. These checks are for trusted local workspaces, not hostile filesystem confinement.

## Scope and exclusions

The selection is explicit, not an inference of all application dependencies. Changes outside it are not detected. If selecting the whole project with `paths: ['.']`, explicitly exclude generated evidence and dependencies that should not be scanned, for example `exclude: ['.tracecraft/local', '.tracecraft/features/invite-member/verification', 'node_modules']`. Exclusions apply to exact paths and descendants, not globs. They are part of the fingerprint's identity; excluding important source files can hide changes.

Git metadata named `.git` is always excluded, including nested Git metadata files/directories. No other folders, reports or ignore-file patterns are excluded automatically. New receipts only leave fingerprints unchanged when outside selected scope or explicitly excluded. Selecting an excluded path is an error. Empty directories are not evidence inputs; their contents are what matter.

## Result and limits

The result contains version 1, SHA-256 algorithm, selected-files scope, normalized sorted selections and exclusions, and a sorted manifest of relative file paths, byte sizes, content hashes and executable bits. The aggregate digest hashes this metadata and manifest as JSON. It includes scope definitions, so equal file contents under different selections do not automatically establish equivalent verification scope.

Timestamps, absolute checkout location and Git state are not included in the digest. Editing a file and restoring its exact bytes and mode restores its fingerprint. A path rename or executable-bit change affects it. Mode semantics and checkout line-ending transformations can differ by platform; this is not a cross-platform equivalence guarantee. The result contains paths and hashes, never file contents; hashes are not encryption and may still reveal information about known or low-entropy data.

Default hard limits are 10,000 visited entries, 8 MiB per file and 64 MiB total file bytes. Files are hashed incrementally; limit failures return no partial snapshot. Callers can lower these limits through `limits: { maxEntries, maxFileBytes, maxTotalBytes }`. Ignored entries are not counted. Overlapping selections are read once. There is no wall-clock timeout for slow or stalled filesystems.

The library checks file identity, size, timestamps and mode before/after reading, and checks directory metadata around traversal. Detected concurrent edits fail with `INPUT_CHANGED`; missing paths and other filesystem errors also fail. This is not an atomic tree snapshot and cannot prove no change occurred between separate reads, or detect changes that were made and restored during execution. Receipt integration compares inputs around command execution and retains these limits. A matching digest alone is not evidence of passing assertions, trusted execution or adequate scope.
