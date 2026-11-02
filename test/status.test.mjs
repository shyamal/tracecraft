import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprintInputs } from '../src/fingerprint.mjs';
import { saveReceipt } from '../src/receipts.mjs';
import { receiptStatus } from '../src/status.mjs';
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
// Synthetic process observation; these tests do not claim a real application check ran.
const observation = () => ({ version: 1, provenance: 'runner', scope: 'process-execution-only', argv: ['fixture'], cwd: '/fixture',
  startedAt: '2026-11-02T00:00:00.000Z', endedAt: '2026-11-02T00:00:00.001Z', durationMs: 1,
  outcome: 'exited-zero', exitCode: 0, signal: null, errorCode: null, outputComplete: true,
  stdout: { text: '', observedBytes: 0, truncated: false }, stderr: { text: '', observedBytes: 0, truncated: false } });
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft-status-')); t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['src', 'test', '.tracecraft', 'evidence']) await mkdir(join(root, dir));
  for (const path of ['src/a.js', 'test/a.js', 'feature.json', '.tracecraft/config.json']) await writeFile(join(root, path), 'original');
  const before = await fingerprintInputs(root, { paths: ['.'], exclude: ['evidence'] });
  const binding = { featurePath: 'feature.json', configPath: '.tracecraft/config.json', commandId: 'unit', before, after: before, state: 'unchanged', errorCode: null };
  const file = join(root, 'evidence', 'run.json'); await saveReceipt(file, observation(), binding);
  return { root, file, binding };
}
test('status checks matching inputs without writes or executing recorded argv', async t => {
  const f = await setup(t), bytes = await readFile(f.file), entries = await readdir(f.root);
  const result = await receiptStatus(f.file, { project: f.root });
  assert.equal(result.ok, true); assert.equal(result.freshness, 'current'); assert.equal(result.compared, true);
  assert.equal(result.assertionCoverageChecked, false); assert.equal(result.authenticityChecked, false);
  assert.deepEqual(await readFile(f.file), bytes); assert.deepEqual(await readdir(f.root), entries);
});
test('source, tests, contract and config edits each become stale with named changes', async t => {
  const f = await setup(t);
  for (const path of ['src/a.js', 'test/a.js', 'feature.json', '.tracecraft/config.json']) {
    await writeFile(join(f.root, path), 'changed');
    const result = await receiptStatus(f.file, { project: f.root });
    assert.equal(result.ok, false); assert.equal(result.freshness, 'stale'); assert.deepEqual(result.changes.modified, [path]);
    await writeFile(join(f.root, path), 'original');
  }
});
test('added and removed files are reported, excluded evidence is ignored', async t => {
  const f = await setup(t); await writeFile(join(f.root, 'evidence/other.json'), 'new record');
  assert.equal((await receiptStatus(f.file, { project: f.root })).ok, true);
  await writeFile(join(f.root, 'src/new.js'), 'new'); await rm(join(f.root, 'test/a.js'));
  const result = await receiptStatus(f.file, { project: f.root });
  assert.equal(result.freshness, 'stale'); assert.deepEqual(result.changes.added, ['src/new.js']); assert.deepEqual(result.changes.removed, ['test/a.js']);
});
test('unbound, unsuccessful and unstable runs never become usable by matching files', async t => {
  const f = await setup(t), legacy = join(f.root, 'evidence/legacy.json');
  await saveReceipt(legacy, observation());
  assert.equal((await receiptStatus(legacy, { project: f.root })).freshness, 'unbound');
  for (const [name, changes] of [['failed', { outcome: 'exited-nonzero', exitCode: 3 }], ['incomplete', { outputComplete: false }], ['cleanup', { errorCode: 'EPERM' }]]) {
    const file = join(f.root, 'evidence', `${name}.json`); await saveReceipt(file, { ...observation(), ...changes }, f.binding);
    const result = await receiptStatus(file, { project: f.root }); assert.equal(result.ok, false); assert.equal(result.freshness, 'current');
  }
  const file = join(f.root, 'evidence/unstable.json');
  await saveReceipt(file, observation(), { ...f.binding, state: 'unavailable', after: null, errorCode: 'ENOENT' });
  const result = await receiptStatus(file, { project: f.root }); assert.equal(result.ok, false); assert.equal(result.freshness, 'unstable-run');
});
test('unreadable selection fails closed and malformed receipts are rejected', async t => {
  const f = await setup(t);
  const before = await fingerprintInputs(f.root, { paths: ['feature.json', '.tracecraft/config.json', 'src/a.js'] });
  const file = join(f.root, 'evidence/selected.json'); await saveReceipt(file, observation(), { ...f.binding, before, after: before });
  await rm(join(f.root, 'src/a.js'));
  const result = await receiptStatus(file, { project: f.root }); assert.equal(result.freshness, 'unavailable'); assert.equal(result.ok, false);
  await writeFile(f.file, '{'); await assert.rejects(receiptStatus(f.file, { project: f.root }), SyntaxError);
});
test('status CLI uses explicit project and meaningful exit codes', async t => {
  const f = await setup(t);
  const run = (...args) => spawnSync(process.execPath, [cli, 'status', f.file, ...args], { encoding: 'utf8' });
  assert.equal(run('--project', f.root).status, 0);
  await writeFile(join(f.root, 'src/a.js'), 'changed'); assert.equal(run('--project', f.root).status, 1);
  for (const args of [[], ['--project'], ['--project', f.root, '--extra'], ['--project', f.root, '--project', f.root]]) assert.equal(run(...args).status, 2);
  await writeFile(f.file, '{}'); assert.equal(run('--project', f.root).status, 2);
});
