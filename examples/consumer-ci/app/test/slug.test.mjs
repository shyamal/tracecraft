import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { slug } from '../src/slug.mjs';
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
test('normalize labels into stable ASCII slugs', () => {
  assert.equal(slug('  Café / Release 42! '), 'cafe-release-42');
  assert.equal(slug('already-a-slug'), 'already-a-slug');
});
test('reject labels with no supported characters', () => {
  for (const label of ['', '---', '   ']) assert.throws(() => slug(label), /ASCII/);
  assert.throws(() => slug(null), /text/);
});
test('CLI prints a slug or fails visibly for invalid input', () => {
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const good = run('Hello World');
  assert.equal(good.status, 0); assert.equal(good.stdout, 'hello-world\n');
  for (const args of [[], ['---'], ['one', 'two']]) {
    const bad = run(...args); assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.ok(bad.stderr);
  }
});
