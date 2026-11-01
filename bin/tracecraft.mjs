#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { draft, impact, validate, stages } from '../src/contract.mjs';
import { createContext, contextStages, defaultContextBytes } from '../src/context.mjs';
import { doctor } from '../src/doctor.mjs';

const emit = value => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
const [command, file, extra, ...rest] = process.argv.slice(2);
const usage = 'Usage: tracecraft new <file> <feature-id> | check <file> [--stage specify|architect|plan] | impact <file> <node-id> | context <file> --stage <specify|architect|plan|implement|test|review> [--max-bytes <2048..1048576>] | doctor [--project <directory>]';

try {
  let stage = 'plan';
  let contextOptions;
  if (!['new', 'check', 'impact', 'context', 'doctor'].includes(command)) throw new Error(usage);
  if (command === 'doctor') {
    if (file !== undefined && (file !== '--project' || !extra || extra.startsWith('--') || rest.length)) throw new Error(usage);
  } else if (!file) throw new Error(usage);
  if (command === 'context') {
    contextOptions = { maxBytes: defaultContextBytes };
    const args = extra === undefined ? [] : [extra, ...rest];
    const seen = new Set();
    for (let i = 0; i < args.length; i += 2) {
      const option = args[i], value = args[i + 1];
      if (!['--stage', '--max-bytes'].includes(option) || seen.has(option) || value === undefined) throw new Error(usage);
      seen.add(option);
      if (option === '--stage') contextOptions.stage = value;
      else {
        if (!/^[1-9]\d*$/.test(value)) throw new Error(usage);
        contextOptions.maxBytes = Number(value);
      }
    }
    if (!contextStages.includes(contextOptions.stage)) throw new Error(usage);
  } else if (command === 'check') {
    if (extra !== undefined) {
      if (extra !== '--stage' || rest.length !== 1 || !stages.includes(rest[0])) throw new Error(usage);
      stage = rest[0];
    }
  } else if (command !== 'doctor' && (!extra || rest.length)) throw new Error(usage);
  if (command === 'doctor') {
    const report = await doctor({ project: extra ?? process.cwd() });
    emit(report);
    process.exitCode = report.ok ? 0 : 1;
  } else if (command === 'context') {
    emit(await createContext(file, contextOptions));
  } else if (command === 'new') {
    const contract = draft(extra);
    await writeFile(file, `${JSON.stringify(contract, null, 2)}\n`, { flag: 'wx' });
    emit({ created: file, state: 'draft', next: 'Add requirements, decisions, tasks and test specifications; then run check.' });
  } else {
    const contract = JSON.parse(await readFile(file, 'utf8'));
    const diagnostics = validate(contract, { stage });
    if (command === 'check' || diagnostics.length) {
      emit({ ok: diagnostics.length === 0, scope: 'structural-only', stage, diagnostics });
      process.exitCode = diagnostics.length ? 1 : 0;
    } else emit({ changed: extra, affected: impact(contract, extra), scope: 'declared-dependencies-only' });
  }
} catch (error) {
  emit({ error: { code: error.code ?? 'INPUT', message: error.message },
    ...(error.diagnostics ? { diagnostics: error.diagnostics } : {}) });
  process.exitCode = error.exitCode ?? 2;
}
