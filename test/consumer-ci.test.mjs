import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const script = fileURLToPath(new URL('../examples/consumer-ci/run-ci.mjs', import.meta.url));
test('sample consumer enforces evidence gates through public CLI commands', { skip: process.platform === 'win32' }, () => {
  const result = spawnSync(process.execPath, [script, '--toolkit', root], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.deepEqual(report.observations.map(item => [item.scenario, item.exitCode]), [
    ['structural-plan', 0], ['preview', 0], ['passing-tests', 0], ['usable-evidence', 0],
    ['changed-source', 1], ['missing-receipt', 1], ['failing-tests', 1], ['failed-evidence', 1],
    ['repaired-tests', 0], ['repaired-evidence', 0],
  ]);
});
