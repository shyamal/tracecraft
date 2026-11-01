import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { doctor, requiredResources } from '../src/doctor.mjs';

const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
const goodGit = async args => ({ stdout: args[0] === '--version' ? 'git version 2.55.0\n' : 'true\n' });
const check = (report, id) => report.checks.find(item => item.id === id);
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft-doctor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project with spaces'), toolkitRoot = join(root, 'toolkit');
  await mkdir(project); await mkdir(toolkitRoot);
  await writeFile(join(toolkitRoot, 'package.json'), JSON.stringify({ name: 'tracecraft-prototype', version: '0.1.0' }));
  for (const path of requiredResources) {
    const absolute = join(toolkitRoot, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, 'resource fixture');
  }
  return { project, toolkitRoot, nodeVersion: '26.5.0', git: goodGit };
}

test('healthy setup passes without requiring configuration or host installation', async t => {
  const options = await setup(t);
  const result = await doctor(options);
  assert.equal(result.ok, true);
  assert.equal(result.scope, 'local-setup-only');
  assert.equal(check(result, 'runtime').status, 'pass');
  assert.equal(check(result, 'toolkit.resources').status, 'pass');
  assert.equal(check(result, 'project.artifacts').status, 'info');
  assert.equal(check(result, 'host.integration').status, 'info');
  assert.equal(result.counts.fail, 0);
  assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), result.checks.length);
});

test('unsupported runtime fails with a remedy', async t => {
  const options = await setup(t);
  for (const version of ['22.0.0', 'invalid']) {
    const result = await doctor({ ...options, nodeVersion: version });
    assert.equal(result.ok, false);
    assert.equal(check(result, 'runtime').status, 'fail');
    assert.ok(check(result, 'runtime').remedy);
  }
});

test('review skill requires its entrypoint, finding guidance and report template', async t => {
  const options = await setup(t);
  for (const resource of ['skills/tc-review/SKILL.md', 'skills/tc-review/references/review.md', 'skills/tc-review/assets/review.md']) {
    const path = join(options.toolkitRoot, resource);
    const content = await readFile(path);
    await rm(path);
    const result = await doctor(options);
    assert.equal(result.ok, false);
    assert.ok(check(result, 'toolkit.resources').message.includes(resource));
    await writeFile(path, content);
  }
});

test('execution skills require their evidence guidance and report templates', async t => {
  const options = await setup(t);
  for (const resource of ['skills/references/execution.md', 'skills/tc-implement/assets/implementation.md', 'skills/tc-test/assets/verification.md']) {
    const path = join(options.toolkitRoot, resource);
    const content = await readFile(path);
    await rm(path);
    const result = await doctor(options);
    assert.equal(result.ok, false);
    assert.ok(check(result, 'toolkit.resources').message.includes(resource));
    await writeFile(path, content);
  }
});

test('missing and empty resources and invalid manifests are actionable failures', async t => {
  const options = await setup(t);
  await rm(join(options.toolkitRoot, 'skills/references/contract.md'));
  await writeFile(join(options.toolkitRoot, 'skills/tc-plan/SKILL.md'), '');
  await writeFile(join(options.toolkitRoot, 'package.json'), '{broken');
  const result = await doctor(options);
  assert.equal(result.ok, false);
  assert.equal(check(result, 'toolkit.manifest').status, 'fail');
  const resources = check(result, 'toolkit.resources');
  assert.equal(resources.status, 'fail');
  assert.match(resources.message, /skills\/references\/contract.md/);
  assert.match(resources.message, /skills\/tc-plan\/SKILL.md/);
});

test('missing or non-directory project fails and skips project probes', async t => {
  const options = await setup(t);
  let calls = 0;
  const git = async () => { calls++; throw new Error('Should not run'); };
  const file = join(options.project, 'file'); await writeFile(file, 'x');
  for (const project of [join(options.project, 'absent'), file]) {
    const result = await doctor({ ...options, project, git });
    assert.equal(result.ok, false);
    assert.equal(check(result, 'project.directory').status, 'fail');
    assert.equal(check(result, 'project.git'), undefined);
  }
  assert.equal(calls, 0);
});

test('Git absence, timeout and refusal warn without blocking local commands', async t => {
  const options = await setup(t);
  for (const code of ['ENOENT', 'ETIMEDOUT']) {
    const result = await doctor({ ...options, git: async () => { throw Object.assign(new Error(code), { code }); } });
    assert.equal(result.ok, true);
    assert.equal(check(result, 'git.available').status, 'warn');
    assert.equal(check(result, 'project.git'), undefined);
  }
  for (const outcome of ['false\n', 'refused']) {
    const result = await doctor({ ...options, git: async args => {
      if (args[0] === '--version') return goodGit(args);
      if (outcome === 'refused') throw new Error('Git refused access');
      return { stdout: outcome };
    } });
    assert.equal(result.ok, true);
    assert.equal(check(result, 'project.git').status, 'warn');
  }
});

test('project probes use only the selected cwd and read-only Git arguments', async t => {
  const options = await setup(t), calls = [];
  await doctor({ ...options, git: async (args, cwd) => { calls.push({ args, cwd }); return goodGit(args); } });
  assert.deepEqual(calls, [
    { args: ['--version'], cwd: options.project },
    { args: ['rev-parse', '--is-inside-work-tree'], cwd: options.project },
  ]);
});

test('artifact path collisions fail; config contents are not exposed or executed', async t => {
  const options = await setup(t);
  const artifacts = join(options.project, '.tracecraft');
  await writeFile(artifacts, 'existing user file');
  const conflict = await doctor(options);
  assert.equal(conflict.ok, false);
  assert.equal(check(conflict, 'project.artifacts').status, 'fail');
  assert.equal(await readFile(artifacts, 'utf8'), 'existing user file');
  await rm(artifacts); await mkdir(artifacts);
  const contents = '{broken-json SECRET_DATA run-anything';
  await writeFile(join(artifacts, 'config.json'), contents);
  const result = await doctor(options);
  assert.equal(result.ok, true);
  assert.equal(check(result, 'project.config').status, 'info');
  assert.ok(!JSON.stringify(result).includes('SECRET_DATA'));
  assert.equal(await readFile(join(artifacts, 'config.json'), 'utf8'), contents);
});

test('CLI doctor defaults to cwd, accepts explicit project and does not create files', async t => {
  const options = await setup(t);
  await writeFile(join(options.project, 'sentinel.txt'), 'unchanged');
  const before = await readdir(options.project);
  const run = (...args) => spawnSync(process.execPath, [cli, 'doctor', ...args], { cwd: options.project, encoding: 'utf8' });
  for (const args of [[], ['--project', options.project]]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(await realpath(JSON.parse(result.stdout).project), await realpath(options.project));
  }
  assert.deepEqual(await readdir(options.project), before);
  assert.equal(await readFile(join(options.project, 'sentinel.txt'), 'utf8'), 'unchanged');
  assert.equal(run('--project', join(options.project, 'missing')).status, 1);
  for (const args of [['extra'], ['--project'], ['--project', '--bad'], ['--project', options.project, 'extra'], ['--unknown'], ['--project', options.project, '--project', options.project]]) {
    assert.equal(run(...args).status, 2);
  }
});
