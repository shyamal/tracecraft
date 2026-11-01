#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { draft, impact, validate } from '../src/contract.mjs';

const emit = value => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
const [command, file, extra, ...rest] = process.argv.slice(2);
const usage = 'Usage: tracecraft new <file> <feature-id> | check <file> | impact <file> <node-id>';

try {
  if (!['new', 'check', 'impact'].includes(command) || !file || rest.length ||
      (command === 'check' ? extra !== undefined : !extra)) throw new Error(usage);
  if (command === 'new') {
    const contract = draft(extra);
    await writeFile(file, `${JSON.stringify(contract, null, 2)}\n`, { flag: 'wx' });
    emit({ created: file, state: 'draft', next: 'Add requirements, decisions, tasks and test specifications; then run check.' });
  } else {
    const contract = JSON.parse(await readFile(file, 'utf8'));
    const diagnostics = validate(contract);
    if (command === 'check' || diagnostics.length) {
      emit({ ok: diagnostics.length === 0, scope: 'structural-only', diagnostics });
      process.exitCode = diagnostics.length ? 1 : 0;
    } else emit({ changed: extra, affected: impact(contract, extra), scope: 'declared-dependencies-only' });
  }
} catch (error) {
  emit({ error: { code: error.code ?? 'INPUT', message: error.message } });
  process.exitCode = 2;
}
