import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprintInputs } from '../src/fingerprint.mjs';
import { saveReceipt } from '../src/receipts.mjs';
import { featureReadiness } from '../src/policy.mjs';
const feature = JSON.parse(await readFile(new URL('../examples/invite-member-v2.json', import.meta.url), 'utf8'));
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
// Synthetic records exercise policy. They do not claim a real review or application run.
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft-policy-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.tracecraft'));
  await writeFile(join(root, 'feature.json'), JSON.stringify(feature)); await writeFile(join(root, 'source.js'), 'original');
  await writeFile(join(root, '.tracecraft/config.json'), JSON.stringify({ schemaVersion: 1, commands: { unit: { argv: ['fixture'] } } }));
  const before = await fingerprintInputs(root, { paths: ['feature.json', '.tracecraft/config.json', 'source.js'] });
  const o = { version: 1, provenance: 'runner', scope: 'process-execution-only', argv: ['fixture'], cwd: '/fixture', startedAt: '2026-11-02T00:00:00.000Z', endedAt: '2026-11-02T00:00:00.001Z', durationMs: 1, outcome: 'exited-zero', exitCode: 0, signal: null, errorCode: null, outputComplete: true, stdout: { text: '', truncated: false, observedBytes: 0 }, stderr: { text: '', truncated: false, observedBytes: 0 } };
  await saveReceipt(join(root, 'run.json'), o, { featurePath: 'feature.json', configPath: '.tracecraft/config.json', commandId: 'unit', before, after: before, state: 'unchanged', errorCode: null });
  const manifest = { schemaVersion: 1, feature: 'feature.json', checks: [{ commandId: 'unit', testIds: feature.tests.map(t => t.id), receipt: 'run.json' }] };
  const file = join(root, 'evidence.json'); await writeFile(file, JSON.stringify(manifest));
  await writeFile(join(root, 'review.md'), 'Synthetic fixture review report.');
  const inputs = await fingerprintInputs(root, { paths: ['feature.json', '.tracecraft/config.json', 'source.js', 'run.json', 'evidence.json', 'review.md'] });
  const record = { schemaVersion: 1, feature: 'feature.json', report: 'review.md', outcome: 'no-findings', coverage: 'complete', findings: [], inputs };
  const save = () => writeFile(join(root, 'review.json'), JSON.stringify(record)); await save();
  return { root, file, record, save, run: () => featureReadiness(file, { project: root, review: 'review.json' }) };
}
test('readiness separates planning, execution and declared review without granting approval', async t => {
  const f = await setup(t), before = await readFile(join(f.root, 'review.json'));
  const r = await f.run(); assert.equal(r.ok, true); assert.deepEqual(Object.values(r.gates).map(g => g.state), ['ready', 'ready', 'ready']);
  assert.equal(r.approvalGranted, false); assert.equal(r.authenticityChecked, false);
  assert.deepEqual(await readFile(join(f.root, 'review.json')), before);
});
test('a missing review blocks overall readiness while execution stays ready', async t => {
  const f = await setup(t), r = await featureReadiness(f.file, { project: f.root });
  assert.equal(r.ok, false); assert.equal(r.gates.execution.state, 'ready'); assert.equal(r.gates.review.reasons[0].code, 'REVIEW_MISSING');
});
test('findings, incomplete coverage and wrong features block review', async t => {
  const f = await setup(t), original = structuredClone(f.record);
  for (const mutation of [r => r.findings = [{ id: 'F1', summary: 'Defect', resolved: false }], r => r.coverage = 'partial', r => r.outcome = 'incomplete', r => r.feature = 'other.json']) {
    Object.assign(f.record, structuredClone(original)); mutation(f.record); await f.save();
    const r = await f.run(); assert.equal(r.ok, false); assert.equal(r.gates.review.state, 'blocked');
  }
});
test('changed reports and receipts invalidate review even if execution remains current', async t => {
  const f = await setup(t);
  await writeFile(join(f.root, 'review.md'), 'Changed review'); let r = await f.run();
  assert.equal(r.gates.execution.state, 'ready'); assert.ok(r.gates.review.reasons.some(x => x.code === 'REVIEW_STALE'));
  await writeFile(join(f.root, 'review.md'), 'Synthetic fixture review report.');
  const receipt = JSON.parse(await readFile(join(f.root, 'run.json'), 'utf8')); receipt.observation.durationMs = 2;
  await writeFile(join(f.root, 'run.json'), JSON.stringify(receipt)); r = await f.run();
  assert.equal(r.gates.execution.state, 'ready'); assert.equal(r.ok, false);
});
test('review scope must cover execution inputs and evidence, not just the report', async t => {
  const f = await setup(t); f.record.inputs = await fingerprintInputs(f.root, { paths: ['review.md'] }); await f.save();
  const r = await f.run(); assert.equal(r.ok, false); assert.ok(r.gates.review.reasons.some(x => x.code === 'REVIEW_SCOPE'));
});
test('stale execution and malformed review records cannot become ready', async t => {
  const f = await setup(t); await writeFile(join(f.root, 'review.json'), '{'); assert.equal((await f.run()).ok, false);
  await f.save(); await writeFile(join(f.root, 'source.js'), 'changed'); const r = await f.run();
  assert.equal(r.gates.execution.state, 'blocked'); assert.equal(r.gates.review.state, 'blocked');
});
test('readiness CLI returns 0 only for all gates, 1 for blockers and 2 for usage', async t => {
  const f = await setup(t); const run = (...args) => spawnSync(process.execPath, [cli, 'readiness', f.file, ...args], { encoding: 'utf8' });
  assert.equal(run('--project', f.root, '--review', 'review.json').status, 0);
  assert.equal(run('--project', f.root).status, 1);
  assert.equal(run('--review', 'review.json').status, 2);
  assert.equal(run('--project', f.root, '--review', 'review.json', '--review', 'again.json').status, 2);
});
