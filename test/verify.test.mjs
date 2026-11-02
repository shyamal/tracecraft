import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { readReceipt, validateReceipt } from '../src/receipts.mjs';
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
const fixture = await readFile(new URL('../examples/invite-member-v2.json', import.meta.url), 'utf8');
const posix = { skip: process.platform === 'win32' };
async function setup(t, source = 'console.log("executed")') {
  const root = await mkdtemp(join(tmpdir(), 'tracecraft verify '));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.tracecraft'));
  const feature = join(root, 'feature.json'), receipt = join(root, 'receipt.json');
  await writeFile(feature, fixture);
  const configPath = join(root, '.tracecraft', 'config.json');
  const config = { schemaVersion: 1, commands: { unit: { argv: [process.execPath, '-e', source] } } };
  await writeFile(configPath, JSON.stringify(config));
  const args = ['verify', feature, '--project', root, '--command-id', 'unit', '--receipt', receipt];
  return { root, feature, receipt, config, configPath, args, run: (...override) => spawnSync(process.execPath, [cli, ...(override.length ? override : args)], { encoding: 'utf8' }) };
}
test('verify persists the selected command without claiming feature correctness', posix, async t => {
  const f = await setup(t), result = f.run();
  assert.equal(result.status, 0, result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.outcome, 'exited-zero'); assert.equal(report.inputsBound, false); assert.equal(report.freshnessChecked, false);
  assert.equal((await readReceipt(f.receipt)).observation.stdout.text, 'executed\n');
});
test('failed, missing and timed-out commands save receipts and exit 1', posix, async t => {
  const f = await setup(t);
  for (const [command, outcome] of [
    [{ argv: [process.execPath, '-e', 'process.exit(4)'] }, 'exited-nonzero'],
    [{ argv: ['/nonexistent/tracecraft-command'] }, 'spawn-error'],
    [{ argv: [process.execPath, '-e', 'setInterval(() => {}, 1000)'], timeoutMs: 50 }, 'timed-out'],
  ]) {
    f.config.commands.unit = command; await writeFile(f.configPath, JSON.stringify(f.config));
    const result = f.run(); assert.equal(result.status, 1, result.stdout);
    assert.equal((await readReceipt(f.receipt)).observation.outcome, outcome); await rm(f.receipt);
  }
});
test('invalid configuration, cwd escapes and existing receipts prevent execution', posix, async t => {
  const f = await setup(t, 'require("node:fs").writeFileSync("ran", "yes")');
  const original = structuredClone(f.config);
  for (const mutate of [c => c.schemaVersion = 2, c => c.commands.unit.shell = true, c => c.commands.unit.cwd = '..', c => c.commands.unit.argv = 'echo unsafe']) {
    const c = structuredClone(original); mutate(c); await writeFile(f.configPath, JSON.stringify(c));
    assert.equal(f.run().status, 2); await assert.rejects(access(join(f.root, 'ran')));
  }
  await writeFile(f.configPath, JSON.stringify(original)); await writeFile(f.receipt, 'preserve');
  assert.equal(f.run().status, 2); assert.equal(await readFile(f.receipt, 'utf8'), 'preserve');
  await assert.rejects(access(join(f.root, 'ran')));
});
test('unknown commands, incomplete contracts and malformed flags fail before execution', posix, async t => {
  const f = await setup(t, 'require("node:fs").writeFileSync("ran", "yes")');
  for (const args of [f.args.slice(0, -2), [...f.args, '--receipt', 'other'], [...f.args, '--shell', 'true'], f.args.map(a => a === 'unit' ? 'absent' : a)]) {
    assert.equal(f.run(...args).status, 2); await assert.rejects(access(join(f.root, 'ran')));
  }
  const contract = JSON.parse(fixture); contract.requirements = [];
  await writeFile(f.feature, JSON.stringify(contract)); assert.equal(f.run().status, 1);
  await assert.rejects(access(join(f.root, 'ran'))); await assert.rejects(access(f.receipt));
});
test('CLI cancellation saves a cancelled receipt', posix, async t => {
  const f = await setup(t, 'console.log("ready"); setInterval(() => {}, 1000)');
  // Signal only after the selected command starts, using a fixture marker.
  f.config.commands.unit.argv[2] = 'require("node:fs").writeFileSync("ready", "yes"); setInterval(() => {}, 1000)';
  await writeFile(f.configPath, JSON.stringify(f.config));
  const child = spawn(process.execPath, [cli, ...f.args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = new Promise(resolve => child.on('close', resolve));
  t.after(() => child.kill('SIGKILL'));
  const deadline = Date.now() + 5000; let ready = false;
  while (Date.now() < deadline) {
    try { await access(join(f.root, 'ready')); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(ready, true); child.kill('SIGINT'); assert.equal(await closed, 1);
  assert.equal((await readReceipt(f.receipt)).observation.outcome, 'cancelled');
});


test('dry-run previews invocation without executing or writing a receipt', posix, async t => {
  const f = await setup(t, 'require("node:fs").writeFileSync("ran", "yes")');
  const result = f.run(...f.args, '--dry-run'); assert.equal(result.status, 0, result.stdout);
  const report = JSON.parse(result.stdout); assert.equal(report.dryRun, true);
  assert.deepEqual(report.argv, f.config.commands.unit.argv);
  await assert.rejects(access(join(f.root, 'ran'))); await assert.rejects(access(f.receipt));
});


test('bound verification stores mandatory feature/config inputs and unchanged fingerprints', posix, async t => {
  const f = await setup(t); await writeFile(join(f.root, 'source.js'), 'original');
  f.config.commands.unit.inputs = { paths: ['source.js'] };
  await writeFile(f.configPath, JSON.stringify(f.config));
  const preview = f.run(...f.args, '--dry-run'); assert.equal(preview.status, 0, preview.stdout);
  assert.ok(JSON.parse(preview.stdout).inputs.paths.includes('feature.json'));
  const result = f.run(); assert.equal(result.status, 0, result.stdout);
  const report = JSON.parse(result.stdout); assert.equal(report.inputsBound, true); assert.equal(report.inputState, 'unchanged');
  const receipt = await readReceipt(f.receipt); assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.binding.before.digest, receipt.binding.after.digest);
  assert.deepEqual(receipt.binding.before.files.map(f => f.path), ['.tracecraft/config.json', 'feature.json', 'source.js']);
  const badDigest = structuredClone(receipt); badDigest.binding.before.files[0].sha256 = 'a'.repeat(64);
  assert.ok(validateReceipt(badDigest).length);
  const badState = structuredClone(receipt); badState.binding.state = 'changed';
  assert.ok(validateReceipt(badState).length);
});
test('input mutation or removal preserves execution evidence but fails verification', posix, async t => {
  const f = await setup(t);
  for (const [source, expected] of [
    ['require("node:fs").writeFileSync("source.js", "changed")', 'changed'],
    ['require("node:fs").unlinkSync("source.js")', 'unavailable'],
  ]) {
    await writeFile(join(f.root, 'source.js'), 'original');
    f.config.commands.unit = { argv: [process.execPath, '-e', source], inputs: { paths: ['source.js'] } };
    await writeFile(f.configPath, JSON.stringify(f.config));
    const result = f.run(); assert.equal(result.status, 1, result.stdout);
    const receipt = await readReceipt(f.receipt); assert.equal(receipt.observation.outcome, 'exited-zero');
    assert.equal(receipt.binding.state, expected); await rm(f.receipt);
  }
});
test('selected whole-project snapshots exclude their own receipt destination', posix, async t => {
  const f = await setup(t); f.config.commands.unit.inputs = { paths: ['.'] };
  await writeFile(f.configPath, JSON.stringify(f.config));
  const result = f.run(); assert.equal(result.status, 0, result.stdout);
  const receipt = await readReceipt(f.receipt);
  assert.ok(receipt.binding.before.exclude.includes('receipt.json'));
  assert.equal(receipt.binding.state, 'unchanged');
});
test('missing selections and exclusions of mandatory inputs prevent bound execution', posix, async t => {
  const f = await setup(t, 'require("node:fs").writeFileSync("ran", "yes")');
  for (const inputs of [{ paths: ['missing'] }, { paths: ['.'], exclude: ['feature.json'] }, { paths: ['.'], exclude: ['.tracecraft'] }]) {
    f.config.commands.unit.inputs = inputs; await writeFile(f.configPath, JSON.stringify(f.config));
    assert.equal(f.run().status, 2); await assert.rejects(access(join(f.root, 'ran'))); await assert.rejects(access(f.receipt));
  }
});


test('failed commands keep their failure outcome even with unchanged bound inputs', posix, async t => {
  const f = await setup(t, 'process.exit(5)');
  f.config.commands.unit.inputs = { paths: ['feature.json'] }; await writeFile(f.configPath, JSON.stringify(f.config));
  const result = f.run(); assert.equal(result.status, 1, result.stdout);
  const receipt = await readReceipt(f.receipt);
  assert.equal(receipt.binding.state, 'unchanged'); assert.equal(receipt.observation.exitCode, 5);
});
