import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validate, draft, impact } from '../src/contract.mjs';
import { validateShape } from '../src/schema.mjs';
import { migrateV1 } from '../src/migrate.mjs';
import { createContext } from '../src/context.mjs';

const v1 = JSON.parse(await readFile(new URL('../examples/invite-member.json', import.meta.url), 'utf8'));
const v2 = JSON.parse(await readFile(new URL('../examples/invite-member-v2.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(v2);
const cli = fileURLToPath(new URL('../bin/tracecraft.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const has = (c, code, stage = 'plan') => validate(c, { stage }).some(d => d.code === code);

test('versioned schemas accept both examples; new drafts use v2 without declaring readiness', () => {
  assert.deepEqual(validate(v1), []);
  assert.deepEqual(validate(v2), []);
  const c = draft('new-feature');
  assert.equal(c.schemaVersion, 2);
  assert.deepEqual(c.assumptions, []);
  assert.deepEqual(validateShape(c), []);
  assert.ok(has(c, 'EMPTY'));
});

test('v2 requires sources, stable criterion objects and assumption fields', () => {
  for (const change of [
    c => delete c.assumptions,
    c => c.assumptions[0].status = 'approved',
    c => c.requirements[0].sources = [],
    c => c.requirements[0].sources[0].kind = 'guess',
    c => c.requirements[0].sources[0].reference = ' ',
    c => c.requirements[0].acceptance = ['legacy text'],
    c => c.requirements[0].acceptance[0].id = 'REQ-001',
    c => delete c.tests[0].criterionIds,
  ]) {
    const c = fresh(); change(c); assert.ok(has(c, 'SHAPE') || has(c, 'ID'));
  }
});

test('shape validation neither coerces data nor strips unknown fields', () => {
  const c = fresh(); c.title = 42; c.secret = 'preserve';
  const before = structuredClone(c);
  assert.ok(validateShape(c).length);
  assert.deepEqual(c, before);
  assert.ok(has({ ...c, schemaVersion: '2' }, 'VERSION'));
  // v1 extensions remain accepted, matching the previous contract behavior.
  assert.deepEqual(validate({ ...structuredClone(v1), custom: 'legacy extension' }), []);
});

test('v2 criterion and assumption IDs must be unique across the feature', () => {
  const duplicateAC = fresh(); duplicateAC.requirements[1].acceptance[0].id = 'AC-001';
  assert.ok(has(duplicateAC, 'DUPLICATE'));
  const duplicateASM = fresh(); duplicateASM.assumptions.push(structuredClone(duplicateASM.assumptions[0]));
  assert.ok(has(duplicateASM, 'DUPLICATE'));
});

test('v2 references require existing criteria, owning requirements and assumptions', () => {
  const missing = fresh(); missing.tests[0].criterionIds = ['AC-999'];
  assert.ok(has(missing, 'REFERENCE'));
  const wrongOwner = fresh(); wrongOwner.tests[0].criterionIds = ['AC-003'];
  assert.ok(has(wrongOwner, 'REFERENCE'));
  const assumption = fresh(); assumption.requirements[0].sources[1].reference = 'ASM-999';
  assert.ok(has(assumption, 'REFERENCE'));
});

test('criterion coverage is enforced at plan stage without fabricating early mappings', () => {
  const c = fresh(); c.tests[0].criterionIds = [];
  assert.deepEqual(validate(c, { stage: 'specify' }), []);
  assert.deepEqual(validate(c, { stage: 'architect' }), []);
  assert.ok(has(c, 'COVERAGE'));
  c.tests[0].criterionIds = ['AC-001'];
  assert.ok(validate(c).some(d => d.code === 'COVERAGE' && d.message.includes('AC-002')));
  c.tests[0].criterionIds = ['AC-001', 'AC-002'];
  assert.deepEqual(validate(c), []);
});

test('v2 impact conservatively expands criterion and assumption changes through owners', () => {
  const c = fresh();
  const expected = ['ADR-001', 'REQ-001', 'TASK-001', 'TASK-002', 'TEST-001', 'TEST-002'];
  assert.deepEqual(impact(c, 'AC-001'), expected);
  assert.deepEqual(impact(c, 'ASM-001'), expected);
  c.assumptions.push({ id: 'ASM-002', statement: 'Unused assumption', status: 'open' });
  assert.deepEqual(impact(c, 'ASM-002'), []);
  assert.throws(() => impact(c, 'AC-999'), /Unknown node/);
});

test('migration preserves input, text and existing IDs but leaves test mappings unresolved', () => {
  const before = structuredClone(v1);
  const result = migrateV1(v1);
  assert.deepEqual(v1, before);
  assert.equal(result.contract.schemaVersion, 2);
  for (const group of ['requirements', 'decisions', 'tasks', 'tests']) {
    assert.deepEqual(result.contract[group].map(n => n.id), v1[group].map(n => n.id));
  }
  assert.deepEqual(result.contract.requirements.flatMap(r => r.acceptance.map(a => a.statement)), v1.requirements.flatMap(r => r.acceptance));
  assert.ok(result.contract.requirements.every(r => r.sources[0].kind === 'legacy'));
  assert.ok(result.contract.tests.every(t => t.criterionIds.length === 0));
  assert.deepEqual(validate(result.contract, { stage: 'specify' }), []);
  assert.ok(result.planDiagnostics.some(d => d.code === 'COVERAGE'));
  assert.equal(result.warnings.length, 3);
  assert.deepEqual(result, migrateV1(v1));
});

test('migration rejects invalid inputs, unknown extensions and v2 field collisions without data loss', () => {
  for (const input of [v2, null, { ...v1, requirements: null }, { ...v1, extra: 'valuable data' }, { ...v1, assumptions: ['valuable data'] }]) {
    const before = structuredClone(input);
    assert.throws(() => migrateV1(input), error => error.code === 'MIGRATION');
    assert.deepEqual(input, before);
  }
  const c = structuredClone(v1); c.tests[0].criterionIds = ['legacy extension'];
  assert.throws(() => migrateV1(c), /conflict/);
});

test('context keeps v2 sources, assumptions and criterion links without claiming execution', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'tracecraft-v2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'feature.json'); await writeFile(file, JSON.stringify(v2));
  const packet = await createContext(file, { stage: 'implement' });
  assert.deepEqual(packet.feature.assumptions, v2.assumptions);
  assert.deepEqual(packet.feature.requirements[0].sources, v2.requirements[0].sources);
  assert.deepEqual(packet.feature.tests[0].criterionIds, v2.tests[0].criterionIds);
  assert.equal(packet.scope, 'planning-context-only');
});

test('migration CLI exclusively creates output, preserves source and refuses invalid conversions', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'tracecraft-migrate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, 'old.json'), target = join(dir, 'new.json');
  const original = JSON.stringify(v1, null, 4); await writeFile(source, original);
  const result = run('migrate', source, target);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(JSON.parse(result.stdout).schemaVersion, 2);
  assert.ok(JSON.parse(result.stdout).planDiagnostics.length);
  assert.equal(await readFile(source, 'utf8'), original);
  const created = await readFile(target, 'utf8');
  assert.equal(run('migrate', source, target).status, 2);
  assert.equal(await readFile(target, 'utf8'), created);
  assert.equal(run('migrate', source, source).status, 2);
  assert.equal(await readFile(source, 'utf8'), original);
  assert.equal(run('check', target, '--stage', 'specify').status, 0);
  assert.equal(run('check', target).status, 1);
  const absent = join(dir, 'absent.json');
  assert.equal(run('migrate', target, absent).status, 1);
  await assert.rejects(access(absent));
  await writeFile(source, JSON.stringify({ ...v1, custom: 'must preserve' }));
  assert.equal(run('migrate', source, absent).status, 1);
  await assert.rejects(access(absent));
  assert.equal(run('migrate', source).status, 2);
  assert.equal(run('migrate', source, absent, '--force').status, 2);
  await writeFile(source, '{');
  assert.equal(run('migrate', source, absent).status, 2);
});
