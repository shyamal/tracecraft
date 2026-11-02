import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, rename, symlink, chmod, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fingerprintInputs } from '../src/fingerprint.mjs';
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft-fingerprint-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['src', 'test', '.tracecraft', 'evidence']) await mkdir(join(root, dir));
  for (const [path, content] of [['src/a.js','export const a = 1;'],['test/a.js','assert(a === 1)'],['.tracecraft/config.json','{"commands":{}}'],['feature.json','{"id":"a"}']]) await writeFile(join(root, path), content);
  const paths = ['src', 'test', '.tracecraft/config.json', 'feature.json'];
  return { root, paths, snapshot: () => fingerprintInputs(root, { paths }) };
}
test('fingerprints are deterministic across selection order, timestamps and checkout location', async t => {
  const a = await setup(t), b = await setup(t), before = await a.snapshot();
  assert.deepEqual(before, await b.snapshot());
  assert.deepEqual(before, await fingerprintInputs(a.root, { paths: [...a.paths].reverse().concat('src') }));
  await utimes(join(a.root, 'src/a.js'), new Date(0), new Date(0));
  assert.deepEqual(before, await a.snapshot());
  assert.equal(before.files.length, 4); assert.equal(before.digest.length, 64);
});
test('source, test, contract and configuration changes each invalidate the digest', async t => {
  const f = await setup(t), before = await f.snapshot();
  for (const path of ['src/a.js', 'test/a.js', 'feature.json', '.tracecraft/config.json']) {
    const original = await readFile(join(f.root, path));
    await writeFile(join(f.root, path), 'changed');
    assert.notEqual((await f.snapshot()).digest, before.digest);
    await writeFile(join(f.root, path), original);
    assert.deepEqual(await f.snapshot(), before);
  }
});
test('new, deleted and renamed files within selected directories change the digest', async t => {
  const f = await setup(t), initial = await f.snapshot();
  await writeFile(join(f.root, 'src/untracked.js'), 'new'); const added = await f.snapshot();
  assert.notEqual(added.digest, initial.digest);
  await rename(join(f.root, 'src/untracked.js'), join(f.root, 'src/renamed.js'));
  assert.notEqual((await f.snapshot()).digest, added.digest);
  await rm(join(f.root, 'src/renamed.js')); assert.deepEqual(await f.snapshot(), initial);
  await rm(join(f.root, 'src/a.js')); assert.notEqual((await f.snapshot()).digest, initial.digest);
});
test('explicit evidence exclusions and Git metadata do not affect selected bytes', async t => {
  const f = await setup(t); await mkdir(join(f.root, '.git'));
  const options = { paths: ['.'], exclude: ['evidence'] }, before = await fingerprintInputs(f.root, options);
  await writeFile(join(f.root, 'evidence/run.json'), 'new receipt'); await writeFile(join(f.root, '.git/index'), 'changed index');
  assert.deepEqual(await fingerprintInputs(f.root, options), before);
  const otherScope = await fingerprintInputs(f.root, { paths: f.paths });
  assert.notEqual(otherScope.digest, before.digest);
});
test('traversal, missing inputs, contradictory exclusions and invalid limits fail closed', async t => {
  const f = await setup(t);
  for (const paths of [[], ['../escape'], ['/absolute'], ['C:/absolute'], ['src\\a.js']]) await assert.rejects(fingerprintInputs(f.root, { paths }), TypeError);
  await assert.rejects(fingerprintInputs(f.root, { paths: ['missing'] }), { code: 'ENOENT' });
  await assert.rejects(fingerprintInputs(f.root, { paths: ['src'], exclude: ['src'] }), /excluded/);
  await assert.rejects(fingerprintInputs(f.root, { paths: ['src'], limits: { maxEntries: -1 } }), TypeError);
});
test('symlinks and selected paths under symlink ancestors are rejected', { skip: process.platform === 'win32' }, async t => {
  const f = await setup(t);
  await symlink(join(f.root, 'src'), join(f.root, 'linked'));
  await assert.rejects(fingerprintInputs(f.root, { paths: ['linked/a.js'] }), /Symlink/);
  await assert.rejects(fingerprintInputs(f.root, { paths: ['linked'] }), /Symlink/);
  await symlink(join(f.root, 'feature.json'), join(f.root, 'src/link.json'));
  await assert.rejects(f.snapshot(), /Symlink/);
});
test('entry and byte budgets reject oversized scans instead of returning partial hashes', async t => {
  const f = await setup(t);
  for (const limits of [{ maxEntries: 1 }, { maxFileBytes: 1 }, { maxTotalBytes: 1 }]) await assert.rejects(fingerprintInputs(f.root, { paths: f.paths, limits }), RangeError);
});
test('executable mode changes are reflected on POSIX', { skip: process.platform === 'win32' }, async t => {
  const f = await setup(t), before = await f.snapshot();
  await chmod(join(f.root, 'src/a.js'), 0o755);
  assert.notEqual((await f.snapshot()).digest, before.digest);
});
