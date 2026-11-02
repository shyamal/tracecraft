import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
test('help aliases expose command syntax without creating project files', async t => {
  const cwd = await mkdtemp(join(tmpdir(), 'tracecraft-help-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  let first;
  for (const alias of ['help', '--help', '-h']) {
    const result = spawnSync(process.execPath, [cli, alias], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout); assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout); assert.match(report.usage, /Usage: tracecraft/);
    for (const command of ['help', 'new', 'check', 'impact', 'context', 'doctor', 'migrate', 'verify', 'status', 'evidence', 'readiness', 'review-packet']) assert.ok(report.commands.includes(command), command);
    if (first) assert.deepEqual(report, first); else first = report;
  }
  assert.deepEqual(await readdir(cwd), []);
});
test('extra help arguments and unknown commands remain input errors', () => {
  for (const args of [['help', 'check'], ['--help', '--project', '.'], ['-h', 'extra'], ['unknown-command']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2); assert.ok(JSON.parse(result.stdout).error);
  }
});
