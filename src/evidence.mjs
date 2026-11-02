import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { validate } from './contract.mjs';
import { receiptStatus } from './status.mjs';

const ajv = new Ajv2020({ strict: true, allErrors: true });
const compile = name => ajv.compile(JSON.parse(readFileSync(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8')));
const manifestShape = compile('evidence-v1'), configShape = compile('config-v1');
async function json(file) {
  if (!(await stat(file)).isFile()) throw new TypeError('Input must be a regular file.');
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(1048577); let used = 0;
    while (used < bytes.length) { const { bytesRead } = await handle.read(bytes, used, bytes.length - used, null); if (!bytesRead) break; used += bytesRead; }
    if (used > 1048576) throw new RangeError('Evidence input exceeds 1 MiB.');
    const content = bytes.subarray(0, used);
    return { value: JSON.parse(content.toString('utf8')), hash: createHash('sha256').update(content).digest('hex') };
  } finally { await handle.close(); }
}
const inside = (root, file) => { const r = relative(root, file); return r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r); };
function safePath(path) {
  return typeof path === 'string' && path && !isAbsolute(path) && !/^[A-Za-z]:/.test(path) && !path.includes('\\') && !path.includes('\0') && path.split('/').every(s => s && s !== '.' && s !== '..');
}
async function localPath(root, path) {
  if (!safePath(path)) throw new TypeError('Evidence paths must be project-relative without traversal.');
  const resolved = await realpath(resolve(root, path));
  if (!inside(root, resolved) || resolved !== resolve(root, path)) throw new Error('Evidence paths must not use symlinks.');
  return resolved;
}

/** Aggregate explicitly selected receipts; never discover or pick a passing run. */
export async function featureEvidence(file, { project } = {}) {
  if (!project) throw new TypeError('An explicit project is required.');
  const root = await realpath(project);
  if (!(await stat(root)).isDirectory()) throw new TypeError('Project must be a directory.');
  const manifestFile = await realpath(file);
  if (!inside(root, manifestFile)) throw new Error('Evidence manifest must be inside the project.');
  const manifest = await json(manifestFile), m = manifest.value;
  if (!manifestShape(m)) throw Object.assign(new Error('Invalid evidence manifest; see docs/EVIDENCE.md.'), { code: 'INVALID_EVIDENCE_MANIFEST' });
  const featureFile = await localPath(root, m.feature), configFile = await localPath(root, '.tracecraft/config.json');
  const feature = await json(featureFile), config = await json(configFile);
  if (!configShape(config.value)) throw Object.assign(new Error('Invalid project command configuration.'), { code: 'INVALID_CONFIG' });
  const structural = validate(feature.value, { stage: 'plan' });
  const diagnostics = [], commands = new Set(), covered = new Set();
  const tests = new Set((Array.isArray(feature.value?.tests) ? feature.value.tests : []).map(t => t?.id).filter(id => typeof id === 'string'));
  for (const check of m.checks) {
    if (commands.has(check.commandId)) diagnostics.push({ code: 'DUPLICATE_COMMAND', commandId: check.commandId });
    commands.add(check.commandId);
    if (!Object.hasOwn(config.value.commands, check.commandId)) diagnostics.push({ code: 'UNKNOWN_COMMAND', commandId: check.commandId });
    for (const id of check.testIds) { if (!tests.has(id)) diagnostics.push({ code: 'UNKNOWN_TEST', testId: id }); covered.add(id); }
    if (check.receipt !== null && !safePath(check.receipt)) diagnostics.push({ code: 'RECEIPT_PATH', commandId: check.commandId });
  }
  for (const id of tests) if (!covered.has(id)) diagnostics.push({ code: 'UNCOVERED_TEST', testId: id });
  const result = { ok: false, scope: 'declared-feature-evidence', feature: feature.value?.id ?? null,
    structural: { ok: structural.length === 0, diagnostics: structural },
    policy: { ok: diagnostics.length === 0, diagnostics }, checks: [],
    summary: { required: m.checks.length, usable: 0, missing: 0, unusable: 0, notEvaluated: m.checks.length },
    inputsStable: true, assertionCoverageChecked: false, reviewReadinessChecked: false };
  if (structural.length || diagnostics.length) return result;
  for (const check of m.checks) {
    let item = { ...check, state: 'missing' };
    if (check.receipt !== null) {
      try {
        const path = await localPath(root, check.receipt);
        const status = await receiptStatus(path, { project: root });
        const matches = status.receiptVersion === 2 && status.featurePath === m.feature && status.commandId === check.commandId && status.configPath === '.tracecraft/config.json';
        item = { ...check, state: matches && status.ok ? 'usable' : 'unusable', status,
          ...(matches ? {} : { reason: 'RECEIPT_BINDING_MISMATCH' }) };
      } catch (error) {
        item = { ...check, state: error.code === 'ENOENT' ? 'missing' : 'unusable', reason: error.code ?? 'RECEIPT_UNREADABLE' };
      }
    }
    result.checks.push(item); result.summary[item.state]++; result.summary.notEvaluated--;
  }
  // Detect changes to the aggregate's definitions while individual checks were evaluated.
  try {
    result.inputsStable = (await json(manifestFile)).hash === manifest.hash && (await json(featureFile)).hash === feature.hash && (await json(configFile)).hash === config.hash;
  } catch { result.inputsStable = false; }
  result.ok = result.inputsStable && result.summary.usable === result.summary.required;
  return result;
}
