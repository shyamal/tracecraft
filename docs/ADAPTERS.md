# Project-local assistant adapters

Install the seven Tracecraft skills into an existing consuming project from a prepared source checkout (Node 24+, `npm ci --ignore-scripts`). These commands copy skill instructions and linked support documents; they do not install the CLI or its dependencies into the consuming project.

```sh
node /absolute/path/to/tracecraft/bin/tracecraft.mjs install codex --project /absolute/path/to/app --dry-run
node /absolute/path/to/tracecraft/bin/tracecraft.mjs install codex --project /absolute/path/to/app
node /absolute/path/to/tracecraft/bin/tracecraft.mjs install claude --project /absolute/path/to/app --dry-run
node /absolute/path/to/tracecraft/bin/tracecraft.mjs install claude --project /absolute/path/to/app
```

Replace the paths before running. Choose one host or install both. No API calls, global settings, permission grants, hooks, Git operations or application commands run during installation.

## Layout and invocation

| Host | Native entry points | Explicit invocation |
| --- | --- | --- |
| Codex | `.agents/skills/tc-*/SKILL.md` | Ask Codex to use `tc-specify` (or select the skill in its interface) |
| Claude Code | `.claude/skills/tc-*/SKILL.md` | `/tc-specify`, `/tc-architect`, etc. |

Discovery paths were checked against [OpenAI customization documentation](https://learn.chatgpt.com/docs/customization/overview) and [Claude Code skills documentation](https://code.claude.com/docs/en/skills) on 2 November 2026. This is filesystem integration, not a recorded native-host workflow trial. Start a fresh host session in the project and check that all seven skills appear; record host/version and actual invocation results before claiming host compatibility.

Each native skill directory includes its templates and metadata. Shared guidance and transitively linked documents live under `.tracecraft/adapters/<host>/resources/`. Relative Markdown links are rewritten to the installed destinations. There are no symlinks or absolute machine paths in generated instructions. The bundle is generated from canonical `skills/` files; edit those upstream rather than maintaining separate host prompts.

Tell the assistant where the original Tracecraft CLI checkout is located. Run it by absolute path against the consuming project's selected feature. If unavailable, report validation as not run; copied resources are not a runnable toolkit installation. Existing host/user instructions and permissions still govern skill execution.

## Ownership and updates

The JSON report lists planned created/removed/unchanged/conflicting/preserved files. `--dry-run` performs reads only, including on uninstall. Exit 0 means the operation or preview has no conflicts or preserved edits; exit 1 means conflicts or preserved edits need attention; exit 2 means invalid input or an I/O error.

`.tracecraft/adapters/<host>/manifest.json` stores schema version, host and SHA-256 hashes of owned files. Repeat installation of identical content is idempotent and can restore missing owned files. Existing unowned files block installation even if identical. Changed installed files block reinstall. Conflicts are checked before any writes; new files use exclusive creation. On a failed install, newly created unchanged files are removed where possible. Empty directories may remain.

Upgrades deliberately require uninstalling the old installation first. No force-overwrite option exists. Keep local customizations elsewhere, or save and reconcile them explicitly. Commit native directories, the support bundle and manifest together if sharing them with your team. A manifest is local bookkeeping, not a signed or trusted provenance record; review changes to it.

```sh
node /absolute/path/to/tracecraft/bin/tracecraft.mjs uninstall codex --project /absolute/path/to/app --dry-run
node /absolute/path/to/tracecraft/bin/tracecraft.mjs uninstall codex --project /absolute/path/to/app
```

Uninstall removes only files whose current hashes match their recorded hashes. Edited files remain and are reported; the manifest is retained to allow cleanup after restoring those files or handling them manually. Unchanged support files may be removed even when an edited skill remains, so a partially removed installation is not usable. Unrelated files and empty directories remain. The other host's installation is independent.

Paths inside the project must not traverse symlinks, and manifest entries must remain in the host's reserved locations. Do not run concurrent installers/editors against these locations: operations are preflighted and individual creates are exclusive, but the entire filesystem operation is not atomic and does not defend against hostile concurrent path replacement.

## Validation scope

Automated tests cover both layouts, all generated relative Markdown links, preview without writes, idempotence, collision refusal, edited-file preservation, independent host removal, manifest path validation and symlink rejection. Real Codex/Claude invocation and independent handoff remain separate acceptance work.
