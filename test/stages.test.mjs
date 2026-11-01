import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/contract.mjs';

const sample = JSON.parse(await readFile(new URL('../examples/invite-member.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(sample);
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));

test('three-stage handoff accepts complete work only at the appropriate stage', () => {
  const c = fresh(); c.decisions = []; c.tasks = []; c.tests = [];
  assert.deepEqual(validate(c, { stage: 'specify' }), []);
  assert.equal(validate(c, { stage: 'architect' }).filter(d => d.code === 'COVERAGE').length, 2);
  c.decisions = structuredClone(sample.decisions);
  assert.deepEqual(validate(c, { stage: 'architect' }), []);
  assert.equal(validate(c, { stage: 'plan' }).filter(d => d.code === 'COVERAGE').length, 4);
  c.tasks = structuredClone(sample.tasks); c.tests = structuredClone(sample.tests);
  assert.deepEqual(validate(c, { stage: 'plan' }), []);
  assert.deepEqual(validate(c), validate(c, { stage: 'plan' }));
});

test('early stages still reject broken downstream references, shape and cycles', () => {
  for (const stage of ['specify', 'architect']) {
    const broken = fresh(); broken.tasks[0].dependsOn.push('ADR-999');
    assert.ok(validate(broken, { stage }).some(d => d.code === 'REFERENCE'));
    const cyclic = fresh(); cyclic.tasks[0].dependsOn.push('TASK-002');
    assert.ok(validate(cyclic, { stage }).some(d => d.code === 'CYCLE'));
    const malformed = fresh(); malformed.tests[0].summary = '';
    assert.ok(validate(malformed, { stage }).some(d => d.code === 'SHAPE'));
  }
});

test('no stage permits an empty or untestable requirement', () => {
  for (const stage of ['specify', 'architect', 'plan']) {
    const empty = fresh(); empty.requirements = [];
    assert.ok(validate(empty, { stage }).some(d => d.code === 'EMPTY'));
    const vague = fresh(); vague.requirements[0].acceptance = [];
    assert.ok(validate(vague, { stage }).some(d => d.code === 'SHAPE'));
  }
});

test('invalid library stages fail rather than weakening coverage', () => {
  assert.throws(() => validate(fresh(), { stage: 'unknown' }), /Unknown stage/);
  assert.throws(() => validate(fresh(), { stage: '__proto__' }), /Unknown stage/);
});

test('CLI stage selection is explicit, read-only and rejects malformed flags', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tracecraft-stages-'));
  try {
    const file = join(dir, 'feature.json');
    const c = fresh(); c.decisions = []; c.tasks = []; c.tests = [];
    const content = JSON.stringify(c); await writeFile(file, content);
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    const result = run('check', file, '--stage', 'specify');
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).stage, 'specify');
    assert.equal(run('check', file).status, 1);
    assert.equal(run('check', file, '--stage', 'architect').status, 1);
    for (const args of [['--stage'], ['--stage', 'unknown'], ['--stage', 'plan', 'extra'], ['--stage=specify']]) {
      assert.equal(run('check', file, ...args).status, 2);
    }
    assert.equal(run('impact', file, 'REQ-001', '--stage', 'specify').status, 2);
    assert.equal(await readFile(file, 'utf8'), content);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
