import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const requiredResources = [
  'bin/tracecraft.mjs', 'src/contract.mjs', 'src/context.mjs', 'src/doctor.mjs',
  'skills/references/contract.md', 'skills/references/execution.md',
  'skills/tc-specify/SKILL.md', 'skills/tc-specify/assets/brief.md',
  'skills/tc-architect/SKILL.md', 'skills/tc-architect/assets/architecture.md',
  'skills/tc-architect/assets/decision.md',
  'skills/tc-plan/SKILL.md', 'skills/tc-plan/assets/plan.md',
  'skills/tc-implement/SKILL.md', 'skills/tc-implement/assets/implementation.md',
  'skills/tc-test/SKILL.md', 'skills/tc-test/assets/verification.md',
  'skills/tc-review/SKILL.md', 'skills/tc-review/references/review.md', 'skills/tc-review/assets/review.md',
];

async function runGit(args, cwd) {
  // Ignore inherited repository overrides; inspect the selected directory only.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  return exec('git', args, { cwd, env: { ...env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
    timeout: 3000, maxBuffer: 65536, windowsHide: true });
}

/** Read-only diagnostics. Dependency injection supports offline failure-path tests. */
export async function doctor({ project = process.cwd(), toolkitRoot = ownRoot,
  nodeVersion = process.versions.node, git = runGit } = {}) {
  const checks = [];
  const add = (id, status, message, remedy) => checks.push({ id, status, message, ...(remedy ? { remedy } : {}) });
  const root = resolve(project);
  const nodeMajor = Number(nodeVersion.split('.')[0]);
  if (Number.isInteger(nodeMajor) && nodeMajor >= 24) add('runtime', 'pass', `Node.js ${nodeVersion} meets this package's >=24 runtime requirement.`);
  else add('runtime', 'fail', `Node.js ${nodeVersion} does not meet the >=24 runtime requirement.`, 'Run Tracecraft with Node.js 24 or newer.');

  let toolkitVersion = null;
  try {
    const manifest = JSON.parse(await readFile(join(toolkitRoot, 'package.json'), 'utf8'));
    if (manifest.name !== 'tracecraft-prototype' || typeof manifest.version !== 'string' || !manifest.version.trim()) throw new Error('Invalid manifest');
    toolkitVersion = manifest.version;
    add('toolkit.manifest', 'pass', `Tracecraft package ${toolkitVersion} is readable.`);
  } catch {
    add('toolkit.manifest', 'fail', 'The toolkit package manifest is missing, unreadable or invalid.', 'Restore package.json from the same Tracecraft release.');
  }
  const missing = [];
  for (const resource of requiredResources) {
    try {
      const path = join(toolkitRoot, resource);
      const info = await stat(path);
      if (!info.isFile() || info.size === 0) throw new Error('Missing content');
      await access(path, constants.R_OK);
    } catch { missing.push(resource); }
  }
  if (missing.length) add('toolkit.resources', 'fail', `Missing, empty or unreadable resources: ${missing.join(', ')}`, 'Restore the complete toolkit, including the shared skills/references folder and templates.');
  else add('toolkit.resources', 'pass', 'CLI modules, six workflow skills and their templates are present and readable.');

  let projectAvailable = false;
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('Not a directory');
    await access(root, constants.R_OK | constants.X_OK);
    projectAvailable = true;
    add('project.directory', 'pass', 'The selected project directory is accessible.');
  } catch {
    add('project.directory', 'fail', 'The selected project directory is missing or inaccessible.', 'Pass an existing readable directory with --project <directory>.');
  }

  if (projectAvailable) {
    try {
      const { stdout } = await git(['--version'], root);
      if (!/^git version \S+/m.test(stdout)) throw new Error('Unexpected Git response');
      add('git.available', 'pass', 'Git is available.');
      try {
        const result = await git(['rev-parse', '--is-inside-work-tree'], root);
        if (result.stdout.trim() === 'true') add('project.git', 'pass', 'The selected directory is inside a Git working tree.');
        else add('project.git', 'warn', 'The selected directory is not a Git working tree.', 'Use a Git working tree for shared history; local Tracecraft commands can still run.');
      } catch {
        add('project.git', 'warn', 'Git could not verify a working tree here; it may be a non-repository or Git may have refused access.', 'Check the selected directory with git status. Doctor does not change Git configuration.');
      }
    } catch {
      add('git.available', 'warn', 'Git is unavailable or did not answer within the diagnostic limits.', 'Make Git available on PATH for repository workflows; local contract commands do not require it.');
    }
    try {
      const info = await stat(join(root, '.tracecraft'));
      if (!info.isDirectory()) {
        add('project.artifacts', 'fail', '.tracecraft exists but is not a directory.', 'Resolve the conflicting path before creating feature artifacts. Doctor will not replace it.');
      } else {
        await access(join(root, '.tracecraft'), constants.R_OK | constants.X_OK);
        add('project.artifacts', 'pass', 'The project artifact directory is accessible; its contents were not validated.');
      }
    } catch (error) {
      if (error.code === 'ENOENT') add('project.artifacts', 'info', 'No .tracecraft directory yet.', 'Use tc-specify for your first feature; no initialization is required to run doctor.');
      else add('project.artifacts', 'fail', 'The .tracecraft directory could not be inspected.', 'Check access to this project artifact path.');
    }
    try {
      await stat(join(root, '.tracecraft', 'config.json'));
      add('project.config', 'info', 'A config.json path exists, but configuration loading is not implemented; its contents were not read.', 'Do not rely on configured commands or settings being applied yet.');
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') add('project.config', 'info', 'No project configuration is required by this version.');
      else add('project.config', 'warn', 'Project configuration presence could not be checked; no configuration was loaded.', 'Check access to .tracecraft/config.json if you intend to use it later.');
    }
  }
  add('host.integration', 'info', 'Native host installation, authentication and model access are not checked.', 'Use explicit SKILL.md file-based invocation; host adapters remain planned.');
  const counts = Object.fromEntries(['pass', 'warn', 'fail', 'info'].map(status => [status, checks.filter(check => check.status === status).length]));
  return { ok: counts.fail === 0, scope: 'local-setup-only', project: root, toolkitVersion, checks, counts };
}
