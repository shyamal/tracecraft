import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { manageAdapter, renderAdapter } from '../src/adapters.mjs';
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
async function project(t) {
  const dir = await mkdtemp(join(tmpdir(), 'tc-adapters-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir;
}
for (const host of ['codex', 'claude']) {
  test(`${host}: preview, installation, links, idempotence and removal`, async t => {
    const dir = await project(t), options = { host, project: dir };
    const preview = await manageAdapter('install', { ...options, dryRun: true });
    assert.equal(preview.ok, true); assert.deepEqual(await readdir(dir), []);
    const rendered = await renderAdapter(host);
    const installed = await manageAdapter('install', options);
    assert.deepEqual(installed.created, preview.created);
    const entryFiles = [...rendered.keys()].filter(path => path.endsWith('/SKILL.md'));
    assert.equal(entryFiles.length, 7);
    for (const [path, data] of rendered) {
      assert.deepEqual(await readFile(join(dir, path)), data);
      if (!path.endsWith('.md')) continue;
      for (const [, target] of data.toString().matchAll(/\]\(([^\s)]+)\)/g)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
        await readFile(resolve(dir, dirname(path), target.split('#')[0]));
      }
    }
    const repeated = await manageAdapter('install', options);
    assert.equal(repeated.ok, true); assert.equal(repeated.created.length, 0);
    assert.equal(repeated.unchanged.length, rendered.size);
    const before = await readFile(join(dir, installed.manifest));
    await manageAdapter('uninstall', { ...options, dryRun: true });
    assert.deepEqual(await readFile(join(dir, installed.manifest)), before);
    const removed = await manageAdapter('uninstall', options);
    assert.equal(removed.removed.length, rendered.size);
    await assert.rejects(readFile(join(dir, installed.manifest)), { code: 'ENOENT' });
    assert.equal((await manageAdapter('uninstall', options)).removed.length, 0);
  });
}
test('unowned identical files still block installation without writes', async t => {
  const dir = await project(t), rendered = await renderAdapter('codex');
  const [path, data] = rendered.entries().next().value;
  await mkdir(dirname(join(dir, path)), { recursive: true }); await writeFile(join(dir, path), data);
  const report = await manageAdapter('install', { host: 'codex', project: dir });
  assert.equal(report.ok, false); assert.deepEqual(report.conflicts, [path]);
  await assert.rejects(readFile(join(dir, report.manifest)), { code: 'ENOENT' });
  assert.deepEqual(await readFile(join(dir, path)), data);
});
test('edited owned files survive reinstall and uninstall, other host is independent', async t => {
  const dir = await project(t), options = { host: 'codex', project: dir };
  const install = await manageAdapter('install', options);
  const path = install.created.find(path => path.endsWith('/SKILL.md'));
  await writeFile(join(dir, path), 'local edits');
  assert.equal((await manageAdapter('install', options)).ok, false);
  await manageAdapter('install', { ...options, host: 'claude' });
  const removed = await manageAdapter('uninstall', options);
  assert.equal(removed.ok, false); assert.deepEqual(removed.preserved, [path]);
  assert.equal(await readFile(join(dir, path), 'utf8'), 'local edits');
  await readFile(join(dir, '.claude/skills/tc-review/SKILL.md'));
  await readFile(join(dir, install.manifest));
  // Restore the owned bytes to finish removal using the retained manifest.
  await writeFile(join(dir, path), (await renderAdapter('codex')).get(path));
  assert.equal((await manageAdapter('uninstall', options)).ok, true);
});
test('rejects forged paths and symlink ancestors without modifying targets', async t => {
  const dir = await project(t), outside = await project(t), options = { host: 'codex', project: dir };
  await mkdir(join(dir, '.tracecraft/adapters/codex'), { recursive: true });
  await writeFile(join(dir, '.tracecraft/adapters/codex/manifest.json'), JSON.stringify({ schemaVersion: 1, host: 'codex', files: { '../victim': 'a'.repeat(64) } }));
  await assert.rejects(manageAdapter('uninstall', options), /Invalid owned file/);
  await rm(join(dir, '.tracecraft'), { recursive: true });
  await symlink(outside, join(dir, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(manageAdapter('install', options), /Unsafe path/);
  assert.deepEqual(await readdir(outside), []);
});
test('CLI requires explicit host/project, rejects duplicate flags, and previews without writes', async t => {
  const dir = await project(t);
  for (const args of [['install', 'other', '--project', dir], ['install', 'codex'], ['uninstall', 'codex', '--project', dir, '--dry-run', '--dry-run']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2, result.stdout);
  }
  const result = spawnSync(process.execPath, [cli, 'install', 'claude', '--project', dir, '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout); assert.equal(JSON.parse(result.stdout).dryRun, true);
  assert.deepEqual(await readdir(dir), []);
});
