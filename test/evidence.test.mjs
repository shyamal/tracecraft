import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprintInputs } from '../src/fingerprint.mjs';
import { saveReceipt } from '../src/receipts.mjs';
import { verifyFeature } from '../src/verify.mjs';
import { featureEvidence } from '../src/evidence.mjs';
const fixture = await readFile(new URL('../examples/invite-member-v2.json', import.meta.url), 'utf8');
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
// Synthetic observations test aggregation, not real application execution.
const observation = () => ({ version: 1, provenance: 'runner', scope: 'process-execution-only', argv: ['fixture'], cwd: '/fixture',
  startedAt: '2026-11-02T00:00:00.000Z', endedAt: '2026-11-02T00:00:00.001Z', durationMs: 1, outcome: 'exited-zero', exitCode: 0,
  signal: null, errorCode: null, outputComplete: true, stdout: { text: '', observedBytes: 0, truncated: false }, stderr: { text: '', observedBytes: 0, truncated: false } });
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.tracecraft')); await mkdir(join(root, 'receipts'));
  await writeFile(join(root, 'feature.json'), fixture); await writeFile(join(root, 'source.js'), 'original');
  await writeFile(join(root, '.tracecraft/config.json'), JSON.stringify({ schemaVersion: 1, commands: { unit: { argv: ['fixture'] }, integration: { argv: ['fixture'] } } }));
  const snapshot = await fingerprintInputs(root, { paths: ['feature.json', '.tracecraft/config.json', 'source.js'] });
  const binding = { featurePath: 'feature.json', configPath: '.tracecraft/config.json', commandId: 'unit', before: snapshot, after: snapshot, state: 'unchanged', errorCode: null };
  await saveReceipt(join(root, 'receipts/unit.json'), observation(), binding);
  await saveReceipt(join(root, 'receipts/integration.json'), observation(), { ...binding, commandId: 'integration' });
  const tests = JSON.parse(fixture).tests.map(t => t.id);
  const manifest = { schemaVersion: 1, feature: 'feature.json', checks: [
    { commandId: 'unit', testIds: [tests[0]], receipt: 'receipts/unit.json' },
    { commandId: 'integration', testIds: tests.slice(1), receipt: 'receipts/integration.json' },
  ] };
  const file = join(root, 'evidence.json'); const save = () => writeFile(file, JSON.stringify(manifest)); await save();
  return { root, file, manifest, binding, save, run: () => featureEvidence(file, { project: root }) };
}
test('feature evidence aggregates all declared checks without changing artifacts', async t => {
  const f = await setup(t), before = await readFile(f.file), receipt = await readFile(join(f.root, 'receipts/unit.json'));
  const result = await f.run(); assert.equal(result.ok, true); assert.deepEqual(result.summary, { required: 2, usable: 2, missing: 0, unusable: 0, notEvaluated: 0 });
  assert.equal(result.assertionCoverageChecked, false); assert.equal(result.reviewReadinessChecked, false);
  assert.deepEqual(await readFile(f.file), before); assert.deepEqual(await readFile(join(f.root, 'receipts/unit.json')), receipt);
});
test('null and missing receipt paths are reported without choosing another run', async t => {
  const f = await setup(t); f.manifest.checks[0].receipt = null; f.manifest.checks[1].receipt = 'receipts/absent.json'; await f.save();
  const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.summary.missing, 2);
});
test('failed, stale and wrong-command receipts cannot satisfy required checks', async t => {
  const f = await setup(t);
  f.manifest.checks[0].receipt = 'receipts/integration.json'; await f.save();
  let result = await f.run(); assert.equal(result.ok, false); assert.equal(result.checks[0].reason, 'RECEIPT_BINDING_MISMATCH');
  f.manifest.checks[0].receipt = 'receipts/failure.json'; await saveReceipt(join(f.root, 'receipts/failure.json'), { ...observation(), outcome: 'exited-nonzero', exitCode: 3 }, f.binding); await f.save();
  result = await f.run(); assert.equal(result.ok, false); assert.equal(result.checks[0].status.execution.outcome, 'exited-nonzero');
  f.manifest.checks[0].receipt = 'receipts/unit.json'; await f.save(); await writeFile(join(f.root, 'source.js'), 'changed');
  result = await f.run(); assert.equal(result.summary.unusable, 2); assert.equal(result.checks[0].status.freshness, 'stale');
});
test('unknown or duplicate commands and uncovered or unknown tests block the policy', async t => {
  const f = await setup(t), original = structuredClone(f.manifest.checks);
  for (const change of [checks => checks[0].commandId = 'unknown', checks => checks[1].commandId = 'unit', checks => checks.pop(), checks => checks[0].testIds = ['TEST-999']]) {
    f.manifest.checks = structuredClone(original); change(f.manifest.checks); await f.save();
    const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.policy.ok, false); assert.deepEqual(result.checks, []);
  }
});
test('invalid receipts, v1 receipts, and cross-feature evidence are unusable', async t => {
  const f = await setup(t); await writeFile(join(f.root, 'receipts/invalid.json'), '{');
  await saveReceipt(join(f.root, 'receipts/legacy.json'), observation());
  await writeFile(join(f.root, 'other.json'), fixture);
  const snap = await fingerprintInputs(f.root, { paths: ['other.json', '.tracecraft/config.json'] });
  await saveReceipt(join(f.root, 'receipts/other.json'), observation(), { ...f.binding, featurePath: 'other.json', before: snap, after: snap });
  for (const name of ['invalid', 'legacy', 'other']) {
    f.manifest.checks[0].receipt = `receipts/${name}.json`; await f.save();
    const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.checks[0].state, 'unusable');
  }
});
test('manifest traversal and invalid feature contracts fail closed', async t => {
  const f = await setup(t); f.manifest.checks[0].receipt = '../escape'; await f.save(); assert.equal((await f.run()).policy.ok, false);
  f.manifest.checks[0].receipt = 'receipts/unit.json'; await f.save(); await writeFile(join(f.root, 'feature.json'), 'null');
  const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.structural.ok, false);
});
test('evidence CLI distinguishes usable, missing and invalid input', async t => {
  const f = await setup(t); const run = (...args) => spawnSync(process.execPath, [cli, 'evidence', f.file, ...args], { encoding: 'utf8' });
  assert.equal(run('--project', f.root).status, 0);
  f.manifest.checks[0].receipt = null; await f.save(); assert.equal(run('--project', f.root).status, 1);
  assert.equal(run().status, 2); assert.equal(run('--project', f.root, '--extra').status, 2);
  f.manifest.checks = []; await f.save(); assert.equal(run('--project', f.root).status, 2);
});


test('real verify receipts satisfy aggregation until selected source changes', { skip: process.platform === 'win32' }, async t => {
  const f = await setup(t);
  await writeFile(join(f.root, '.tracecraft/config.json'), JSON.stringify({ schemaVersion: 1, commands: { unit: {
    argv: [process.execPath, '-e', 'process.exit(0)'], inputs: { paths: ['source.js'] }
  } } }));
  const ids = f.manifest.checks.flatMap(c => c.testIds);
  f.manifest.checks = [{ commandId: 'unit', testIds: ids, receipt: 'receipts/actual.json' }]; await f.save();
  await verifyFeature(join(f.root, 'feature.json'), { project: f.root, commandId: 'unit', receipt: join(f.root, 'receipts/actual.json') });
  assert.equal((await f.run()).ok, true);
  await writeFile(join(f.root, 'source.js'), 'changed after run');
  const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.checks[0].status.freshness, 'stale');
});
