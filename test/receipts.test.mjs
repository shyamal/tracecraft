import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, stat, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveReceipt, readReceipt, validateReceipt, MAX_RECEIPT_BYTES } from '../src/receipts.mjs';
import { runCommand } from '../src/runner.mjs';
const observation = () => ({ version: 1, provenance: 'runner', scope: 'process-execution-only',
  argv: ['test-tool'], cwd: '/application', startedAt: '2026-11-01T00:00:00.000Z', endedAt: '2026-11-01T00:00:00.010Z', durationMs: 10,
  outcome: 'exited-zero', exitCode: 0, signal: null, errorCode: null, outputComplete: true,
  stdout: { text: 'No tests discovered', truncated: false, observedBytes: 19 }, stderr: { text: '', truncated: false, observedBytes: 0 } });
const wrap = o => ({ schemaVersion: 1, kind: 'execution-receipt', observation: o });
async function directory(t) { const dir = await mkdtemp(join(tmpdir(), 'tracecraft-receipts-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }

test('receipts round-trip without inventing verification claims', async t => {
  const dir = await directory(t), file = join(dir, 'run.json'), o = observation(), before = structuredClone(o);
  await saveReceipt(file, o);
  assert.deepEqual(await readReceipt(file), wrap(o)); assert.deepEqual(o, before);
  assert.deepEqual(await readdir(dir), ['run.json']);
  if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o600);
});
test('existing receipts survive collisions and concurrent creation', async t => {
  const dir = await directory(t), file = join(dir, 'run.json');
  const results = await Promise.allSettled([saveReceipt(file, observation()), saveReceipt(file, observation())]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'EEXIST');
  const before = await readFile(file);
  await assert.rejects(saveReceipt(file, observation()), { code: 'EEXIST' });
  assert.deepEqual(await readFile(file), before); assert.deepEqual(await readdir(dir), ['run.json']);
});
test('malformed versions, unknown fields and contradictory outcomes fail closed', async t => {
  const dir = await directory(t);
  for (const mutate of [r => r.schemaVersion = 2, r => r.approved = true, r => r.observation.outcome = 'passed',
    r => r.observation.exitCode = 4, r => r.observation.startedAt = 'yesterday',
    r => r.observation.stdout.text = 'x'.repeat(1048577), r => r.observation.outcome = 'spawn-error']) {
    const receipt = wrap(observation()); mutate(receipt); assert.ok(validateReceipt(receipt).length);
    const file = join(dir, 'invalid.json'); await writeFile(file, JSON.stringify(receipt));
    await assert.rejects(readReceipt(file), { code: 'INVALID_RECEIPT' });
  }
  const invalid = observation(); invalid.exitCode = 2;
  await assert.rejects(saveReceipt(join(dir, 'never-created.json'), invalid), { code: 'INVALID_RECEIPT' });
  assert.deepEqual(await readdir(dir), ['invalid.json']);
});
test('missing parents, malformed JSON and non-files do not produce valid receipts', async t => {
  const dir = await directory(t);
  await assert.rejects(saveReceipt(join(dir, 'missing', 'run.json'), observation()), { code: 'ENOENT' });
  await assert.rejects(readReceipt(dir), TypeError);
  const file = join(dir, 'partial.json'); await writeFile(file, '{');
  await assert.rejects(readReceipt(file), SyntaxError);
});
test('every observed runner outcome can be persisted, including failures', { skip: process.platform === 'win32' }, async t => {
  const dir = await directory(t);
  const variants = [
    { argv: [process.execPath, '-e', 'console.log("secret")'], redact: ['secret'] },
    { argv: [process.execPath, '-e', 'process.exit(3)'] },
    { argv: ['/nonexistent/tracecraft-executable'] },
    { argv: [process.execPath, '-e', 'setInterval(() => {}, 1000)'], timeoutMs: 50 },
    { argv: [process.execPath, '-e', 'process.kill(process.pid, "SIGTERM")'] },
    { argv: [process.execPath, '-e', 'process.exit(0)'], signal: AbortSignal.abort() },
  ];
  const expected = ['exited-zero','exited-nonzero','spawn-error','timed-out','signalled','cancelled'];
  for (const [i, options] of variants.entries()) {
    const o = await runCommand({ cwd: dir, ...options });
    assert.equal(o.outcome, expected[i]);
    const file = join(dir, `${i}.json`); await saveReceipt(file, o);
    assert.deepEqual((await readReceipt(file)).observation, o);
    if (i === 0) assert.ok(!(await readFile(file, 'utf8')).includes('secret'));
  }
});


test('oversized stored receipts are rejected by the bounded reader', async t => {
  const dir = await directory(t), file = join(dir, 'oversized.json');
  await writeFile(file, '{}'); await truncate(file, MAX_RECEIPT_BYTES + 1);
  await assert.rejects(readReceipt(file), RangeError);
});
