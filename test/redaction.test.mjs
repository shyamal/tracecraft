import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiteralRedactor } from '../src/redaction.mjs';
test('redaction treats regex and replacement syntax as literal characters', () => {
  const literals = ['a+b', '[$1]', '\\path', 'x.y', '(token)', '^end$'];
  const redact = createLiteralRedactor(literals);
  assert.equal(redact(literals.join(' ')), literals.map(() => '[REDACTED]').join(' '));
  assert.equal(redact('aaab xay token end'), 'aaab xay token end');
});
test('redaction preserves callers lists and existing limits', () => {
  const literals = ['short', 'short-long', 'short'], before = [...literals];
  assert.equal(createLiteralRedactor(literals)('short-long short'), '[REDACTED] [REDACTED]');
  assert.deepEqual(literals, before);
  assert.equal(createLiteralRedactor()('unchanged'), 'unchanged');
  for (const bad of ['text', [''], [1], Array(101).fill('x'), ['x'.repeat(4097)]]) assert.throws(() => createLiteralRedactor(bad), TypeError);
});
