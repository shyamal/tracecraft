import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { draft, impact, validate } from '../src/contract.mjs';

const example = JSON.parse(await readFile(new URL('../examples/invite-member.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(example);
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const codes = value => validate(value).map(item => item.code);

test('complete planning example passes structure without claiming execution', () => {
  assert.deepEqual(validate(fixture()), []);
  const r = run('check', fileURLToPath(new URL('../examples/invite-member.json', import.meta.url)));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).scope, 'structural-only');
});
test('new draft is deliberately incomplete', () => {
  assert.ok(codes(draft('new-feature')).includes('EMPTY'));
  assert.throws(() => draft('../escape'), /Feature ID/);
});
test('malformed nested inputs yield diagnostics, not exceptions', () => {
  for (const value of [null, [], 3, {}, { ...fixture(), tasks: null }, { ...fixture(), tests: [null] }]) {
    assert.ok(validate(value).length);
  }
  const c = fixture(); c.tasks[0].requirementIds = [null];
  assert.ok(codes(c).includes('SHAPE'));
});
test('unsupported versions and duplicate IDs fail', () => {
  assert.ok(codes({ ...fixture(), schemaVersion: 2 }).includes('VERSION'));
  const c = fixture(); c.tasks.push(structuredClone(c.tasks[0]));
  assert.ok(codes(c).includes('DUPLICATE'));
});
test('unknown references and missing test coverage fail', () => {
  const c = fixture(); c.tests[0].requirementIds = ['REQ-999'];
  assert.ok(codes(c).includes('REFERENCE'));
  assert.ok(codes(c).includes('COVERAGE'));
});
test('test plan must name a real requirement, not another task', () => {
  const c = fixture(); c.tests[0].requirementIds = ['TASK-001'];
  assert.ok(codes(c).includes('REFERENCE'));
});
test('empty acceptance and malformed dependency lists fail', () => {
  const c = fixture(); c.requirements[0].acceptance = [' '];
  c.tasks[0].dependsOn = 'ADR-001';
  assert.equal(validate(c).filter(x => x.code === 'SHAPE').length, 2);
});
test('dependency cycles and self-cycles fail', () => {
  const c = fixture(); c.tasks[0].dependsOn.push('TASK-002');
  assert.ok(codes(c).includes('CYCLE'));
  const self = fixture(); self.tasks[0].dependsOn.push('TASK-001');
  assert.ok(codes(self).includes('CYCLE'));
});
test('impact follows cross-requirement task dependencies transitively', () => {
  assert.deepEqual(impact(fixture(), 'REQ-001'), ['ADR-001', 'TASK-001', 'TASK-002', 'TEST-001', 'TEST-002']);
  assert.deepEqual(impact(fixture(), 'REQ-002'), ['ADR-002', 'TASK-002', 'TEST-002']);
  assert.deepEqual(impact(fixture(), 'TEST-002'), []);
  assert.throws(() => impact(fixture(), 'REQ-999'), /Unknown node/);
});
test('duplicate edges do not produce false cycles or duplicate impact', () => {
  const c = fixture(); c.tasks[0].dependsOn.push('ADR-001', 'REQ-001');
  assert.deepEqual(validate(c), []);
  assert.equal(impact(c, 'REQ-001').length, 5);
});
test('CLI creates exclusively, rejects bad inputs and uses documented exit codes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tracecraft-test-'));
  try {
    const file = join(dir, 'feature.json');
    assert.equal(run('new', file, 'small-feature').status, 0);
    const before = await readFile(file, 'utf8');
    assert.equal(run('new', file, 'replacement').status, 2);
    assert.equal(await readFile(file, 'utf8'), before);
    assert.equal(run('check', file).status, 1);
    assert.equal(run('impact', file, 'REQ-001').status, 1);
    await writeFile(file, '{broken');
    assert.equal(run('check', file).status, 2);
    assert.equal(run('check', join(dir, 'missing.json')).status, 2);
    assert.equal(run('check', file, '--unknown').status, 2);
    await writeFile(file, JSON.stringify(fixture()));
    assert.equal(run('impact', file, 'REQ-999').status, 2);
    const result = run('impact', file, 'ADR-002');
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).affected, ['TASK-002', 'TEST-002']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
