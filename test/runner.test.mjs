import test from 'node:test';
import assert from 'node:assert/strict';
import { runCommand } from '../src/runner.mjs';
const options = { cwd: process.cwd(), timeoutMs: 3000 };
const posix = { skip: process.platform === 'win32' };
const run = (source, extra = {}) => runCommand({ ...options, argv: [process.execPath, '-e', source], ...extra });

test('runner distinguishes execution results without asserting test success', posix, async () => {
  const zero = await run('console.log("no tests executed")');
  assert.equal(zero.outcome, 'exited-zero'); assert.equal(zero.exitCode, 0);
  assert.equal(zero.scope, 'process-execution-only'); assert.match(zero.stdout.text, /no tests/);
  const failed = await run('console.error("failure"); process.exit(7)');
  assert.equal(failed.outcome, 'exited-nonzero'); assert.equal(failed.exitCode, 7);
  assert.match(failed.stderr.text, /failure/);
});
test('argv shell syntax stays literal and environment is explicit', posix, async t => {
  const previous = process.env.TRACECRAFT_RUNNER_SECRET;
  process.env.TRACECRAFT_RUNNER_SECRET = 'must-not-inherit';
  t.after(() => { if (previous === undefined) delete process.env.TRACECRAFT_RUNNER_SECRET; else process.env.TRACECRAFT_RUNNER_SECRET = previous; });
  const literal = '$(echo unsafe); | > /tmp/never';
  const result = await runCommand({ ...options, argv: [process.execPath, '-e', 'console.log(process.argv[1]); console.log(process.env.TRACECRAFT_RUNNER_SECRET)', literal] });
  assert.equal(result.stdout.text, `${literal}\nundefined\n`);
  const configured = await run('console.log(process.env.CHECK_VALUE)', { env: { CHECK_VALUE: 'selected' } });
  assert.equal(configured.stdout.text, 'selected\n');
});
test('missing executable records spawn failure', posix, async () => {
  const result = await runCommand({ ...options, argv: ['/nonexistent/tracecraft-test-command'] });
  assert.equal(result.outcome, 'spawn-error'); assert.equal(result.errorCode, 'ENOENT');
});
test('timeout and cancellation cannot become successful exits', posix, async () => {
  const timeout = await run('setInterval(() => {}, 1000)', { timeoutMs: 60 });
  assert.equal(timeout.outcome, 'timed-out');
  const controller = new AbortController();
  const pending = run('setInterval(() => {}, 1000)', { signal: controller.signal });
  setTimeout(() => controller.abort(), 60);
  assert.equal((await pending).outcome, 'cancelled');
  assert.equal((await run('process.exit(0)', { signal: controller.signal })).outcome, 'cancelled');
});
test('bounded output redacts literals across chunks and in argv', posix, async () => {
  const result = await run('process.stdout.write("sec"); setTimeout(() => { process.stdout.write("ret"); process.stderr.write("secret"); }, 10)', { redact: ['secret'] });
  assert.equal(result.stdout.text, '[REDACTED]'); assert.equal(result.stderr.text, '[REDACTED]');
  assert.ok(!JSON.stringify(result.argv).includes('secret'));
  const large = await run('process.stdout.write("x".repeat(200000))', { maxOutputBytes: 30 });
  assert.equal(Buffer.byteLength(large.stdout.text), 30); assert.equal(large.stdout.truncated, true);
  const edge = await run('process.stdout.write("secret".repeat(1000))', { maxOutputBytes: 20, redact: ['secret'] });
  assert.ok(!edge.stdout.text.includes('sec')); assert.ok(Buffer.byteLength(edge.stdout.text) <= 20);
});
test('working directory and malformed options fail before execution', posix, async () => {
  for (const extra of [{ cwd: '.' }, { timeoutMs: 0 }, { argv: 'echo unsafe' }, { maxOutputBytes: Infinity }, { env: { X: 1 } }, { redact: [''] }]) {
    await assert.rejects(run('process.exit(0)', extra), TypeError);
  }
  await assert.rejects(run('process.exit(0)', { cwd: '/nonexistent/tracecraft-directory' }));
});
test('parent exit cleans up descendants holding output pipes', posix, async () => {
  const result = await run(`require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: ['ignore', 1, 2]}); setTimeout(() => process.exit(0), 50)`);
  assert.equal(result.outcome, 'exited-zero'); assert.ok(result.durationMs < 2000);
});
test('Windows runner is explicitly unsupported', { skip: process.platform !== 'win32' }, async () => {
  await assert.rejects(run(''), /POSIX/);
});
