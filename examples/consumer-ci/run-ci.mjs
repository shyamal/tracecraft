// Run only in a disposable copy. No source checkout or user application is mutated.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--toolkit') throw new Error('Usage: node run-ci.mjs --toolkit <prepared-tracecraft-checkout>');
if (process.platform === 'win32') throw new Error('This example requires POSIX verify execution; Windows is unsupported');
const cli = join(await realpath(resolve(args[1])), 'bin/tracecraft.mjs');
const temporary = await mkdtemp(join(tmpdir(), 'tracecraft-consumer-'));
const project = join(temporary, 'app');
const observations = [];
try {
  await cp(fileURLToPath(new URL('./app/', import.meta.url)), project, { recursive: true });
  await mkdir(join(project, '.tracecraft/local'), { recursive: true });
  // An absolute executable needs no inherited PATH. No secrets or inherited environment.
  await writeFile(join(project, '.tracecraft/config.json'), JSON.stringify({ schemaVersion: 1, commands: { unit: {
    argv: [process.execPath, '--test', 'test/slug.test.mjs'], cwd: '.', env: {}, timeoutMs: 10000,
    maxOutputBytes: 32768, inputs: { paths: ['src', 'test'] }
  } } }, null, 2) + '\n');
  function run(label, expectedExit, ...argv) {
    const result = spawnSync(process.execPath, [cli, ...argv], { cwd: project, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error) throw result.error;
    assert.equal(result.status, expectedExit, `${label}: unexpected exit; ${result.stdout} ${result.stderr}`);
    const report = JSON.parse(result.stdout);
    observations.push({ scenario: label, exitCode: result.status });
    return report;
  }
  const feature = join(project, 'feature.json'), manifest = join(project, 'evidence.json');
  const receipt = join(project, '.tracecraft/local/unit.json');
  run('structural-plan', 0, 'check', feature);
  const preview = run('preview', 0, 'verify', feature, '--project', project, '--command-id', 'unit', '--receipt', receipt, '--dry-run');
  assert.equal(preview.dryRun, true);
  const verify = () => ['verify', feature, '--project', project, '--command-id', 'unit', '--receipt', receipt];
  const evidence = () => ['evidence', manifest, '--project', project];
  const passed = run('passing-tests', 0, ...verify());
  assert.equal(passed.outcome, 'exited-zero');
  assert.equal(run('usable-evidence', 0, ...evidence()).ok, true);
  const source = join(project, 'src/slug.mjs');
  const original = await readFile(source, 'utf8');
  await writeFile(source, original + '\n// Selected input changed after verification.\n');
  const stale = run('changed-source', 1, ...evidence());
  assert.equal(stale.ok, false); assert.equal(stale.checks[0].status.freshness, 'stale');
  await writeFile(source, original);
  await rm(receipt);
  const missing = run('missing-receipt', 1, ...evidence());
  assert.equal(missing.ok, false); assert.equal(missing.summary.missing, 1);
  await writeFile(source, "export function slug() { return 'broken'; }\n");
  const failed = run('failing-tests', 1, ...verify());
  assert.equal(failed.outcome, 'exited-nonzero');
  const rejected = run('failed-evidence', 1, ...evidence());
  assert.equal(rejected.ok, false);
  assert.equal(rejected.checks[0].status.freshness, 'current');
  assert.equal(rejected.checks[0].status.execution.outcome, 'exited-nonzero');
  await writeFile(source, original);
  await rm(receipt);
  run('repaired-tests', 0, ...verify());
  assert.equal(run('repaired-evidence', 0, ...evidence()).ok, true);
  process.stdout.write(JSON.stringify({ ok: true, scope: 'sample-consumer-ci', observations }, null, 2) + '\n');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
