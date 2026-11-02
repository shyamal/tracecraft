#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { draft, impact, validate, stages } from '../src/contract.mjs';
import { createContext, contextStages, defaultContextBytes } from '../src/context.mjs';
import { doctor } from '../src/doctor.mjs';
import { reviewPacket } from '../src/review-packet.mjs';
import { featureReadiness } from '../src/policy.mjs';
import { featureEvidence } from '../src/evidence.mjs';
import { receiptStatus } from '../src/status.mjs';
import { verifyFeature } from '../src/verify.mjs';
import { migrateV1 } from '../src/migrate.mjs';

const emit = value => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
const [command, file, extra, ...rest] = process.argv.slice(2);
const commands = ['help', 'new', 'check', 'impact', 'context', 'doctor', 'migrate', 'verify', 'status', 'evidence', 'readiness', 'review-packet'];
const usage = 'Usage: tracecraft new <file> <feature-id> | check <file> [--stage specify|architect|plan] | impact <file> <node-id> | context <file> --stage <specify|architect|plan|implement|test|review> [--max-bytes <2048..1048576>] | doctor [--project <directory>] | migrate <v1-file> <new-v2-file> | verify <feature-file> --project <dir> --command-id <id> --receipt <new-file> [--dry-run] | status <receipt-file> --project <dir> | evidence <manifest-file> --project <dir> | readiness <manifest-file> --project <dir> [--review <project-relative-file>] | review-packet <manifest-file> --project <dir> --diff <relative-file> [--max-bytes <4096..1048576>] | help | --help | -h';

async function main() {
  if (['help', '--help', '-h'].includes(command)) {
    if (file !== undefined) throw new Error(usage);
    emit({ usage, commands });
    return;
  }
  let stage = 'plan';
  let contextOptions, verifyOptions, readinessOptions, packetOptions;
  if (!commands.includes(command)) throw new Error(usage);
  if (command === 'doctor') {
    if (file !== undefined && (file !== '--project' || !extra || extra.startsWith('--') || rest.length)) throw new Error(usage);
  } else if (!file) throw new Error(usage);
  if (command === 'review-packet') {
    packetOptions = {};
    const args = extra === undefined ? [] : [extra, ...rest];
    for (let i = 0; i < args.length; i += 2) {
      const option = args[i], value = args[i + 1];
      if (!['--project', '--diff', '--max-bytes'].includes(option) || !value || value.startsWith('--')) throw new Error(usage);
      const key = option === '--max-bytes' ? 'maxBytes' : option.slice(2);
      if (Object.hasOwn(packetOptions, key)) throw new Error(usage);
      if (key === 'maxBytes' && !/^[1-9]\d*$/.test(value)) throw new Error(usage);
      packetOptions[key] = key === 'maxBytes' ? Number(value) : value;
    }
    if (!packetOptions.project || !packetOptions.diff) throw new Error(usage);
  } else if (command === 'readiness') {
    readinessOptions = {};
    const args = extra === undefined ? [] : [extra, ...rest];
    for (let i = 0; i < args.length; i += 2) {
      const option = args[i], value = args[i + 1];
      if (!['--project', '--review'].includes(option) || !value || value.startsWith('--')) throw new Error(usage);
      const key = option.slice(2);
      if (Object.hasOwn(readinessOptions, key)) throw new Error(usage);
      readinessOptions[key] = value;
    }
    if (!readinessOptions.project) throw new Error(usage);
  } else if (command === 'status' || command === 'evidence') {
    if (extra !== '--project' || rest.length !== 1 || !rest[0] || rest[0].startsWith('--')) throw new Error(usage);
  } else if (command === 'verify') {
    verifyOptions = {};
    const args = extra === undefined ? [] : [extra, ...rest];
    const keys = { '--project': 'project', '--command-id': 'commandId', '--receipt': 'receipt' };
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === '--dry-run') {
        if (verifyOptions.dryRun) throw new Error(usage);
        verifyOptions.dryRun = true; i--; continue;
      }
      const key = Object.hasOwn(keys, args[i]) ? keys[args[i]] : undefined, value = args[i + 1];
      if (!key || Object.hasOwn(verifyOptions, key) || !value || value.startsWith('--')) throw new Error(usage);
      verifyOptions[key] = value;
    }
    if (!verifyOptions.project || !verifyOptions.commandId || !verifyOptions.receipt) throw new Error(usage);
  } else if (command === 'context') {
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
  if (command === 'review-packet') {
    emit(await reviewPacket(file, packetOptions));
  } else if (command === 'readiness') {
    const report = await featureReadiness(file, readinessOptions);
    emit(report); process.exitCode = report.ok ? 0 : 1;
  } else if (command === 'status' || command === 'evidence') {
    const report = await (command === 'status' ? receiptStatus : featureEvidence)(file, { project: rest[0] });
    emit(report); process.exitCode = report.ok ? 0 : 1;
  } else if (command === 'verify') {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
      const report = await verifyFeature(file, { ...verifyOptions, signal: controller.signal });
      emit(report); process.exitCode = report.dryRun || (report.outcome === 'exited-zero' && !['changed', 'unavailable'].includes(report.inputState)) ? 0 : 1;
    } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
  } else if (command === 'migrate') {
    const result = migrateV1(JSON.parse(await readFile(file, 'utf8')));
    await writeFile(extra, `${JSON.stringify(result.contract, null, 2)}\n`, { flag: 'wx' });
    emit({ created: extra, schemaVersion: 2, warnings: result.warnings, planDiagnostics: result.planDiagnostics });
  } else if (command === 'doctor') {
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
}

try {
  await main();
} catch (error) {
  emit({ error: { code: error.code ?? 'INPUT', message: error.message },
    ...(error.diagnostics ? { diagnostics: error.diagnostics } : {}) });
  process.exitCode = error.exitCode ?? 2;
}
