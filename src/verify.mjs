import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync, constants } from 'node:fs';
import { open, realpath, stat, lstat, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, join } from 'node:path';
import { validate } from './contract.mjs';
import { runCommand } from './runner.mjs';
import { saveReceipt } from './receipts.mjs';

const ajv = new Ajv2020({ strict: true, allErrors: true });
const configShape = ajv.compile(JSON.parse(readFileSync(new URL('../schemas/config-v1.schema.json', import.meta.url), 'utf8')));
async function readJson(file, limit) {
  if (!(await stat(file)).isFile()) throw new TypeError('Input must be a regular file.');
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(limit + 1); let used = 0;
    while (used < bytes.length) {
      const { bytesRead } = await handle.read(bytes, used, bytes.length - used, null);
      if (!bytesRead) break; used += bytesRead;
    }
    if (used > limit) throw new RangeError('Input exceeds its byte limit.');
    return JSON.parse(bytes.subarray(0, used).toString('utf8'));
  } finally { await handle.close(); }
}
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel); };

/** Execute one explicitly selected configuration entry, then persist its observation. */
export async function verifyFeature(file, { project, commandId, receipt, signal, dryRun = false } = {}) {
  if (!project || !commandId || !receipt) throw new TypeError('project, commandId and receipt are required.');
  if (process.platform === 'win32') throw new Error('Verification execution currently supports POSIX hosts only.');
  const root = await realpath(project);
  if (!(await stat(root)).isDirectory()) throw new TypeError('Project must be a directory.');
  const featurePath = await realpath(resolve(file));
  if (!inside(root, featurePath)) throw new Error('Feature must be inside the selected project.');
  const contract = await readJson(featurePath, 1048576);
  const diagnostics = validate(contract, { stage: 'plan' });
  if (diagnostics.length) throw Object.assign(new Error('Feature must pass the plan-stage structural check before execution.'), { code: 'INVALID_CONTRACT', exitCode: 1, diagnostics });
  const configPath = await realpath(join(root, '.tracecraft', 'config.json'));
  if (!inside(root, configPath)) throw new Error('Configuration must resolve inside the selected project.');
  const config = await readJson(configPath, 65536);
  if (!configShape(config)) throw Object.assign(new Error('Invalid project command configuration; see docs/VERIFY.md.'), { code: 'INVALID_CONFIG' });
  if (!Object.hasOwn(config.commands, commandId)) throw new Error('Unknown command ID.');
  const command = config.commands[commandId];
  if (!command.argv[0]) throw new Error('Command executable must not be empty.');
  if (isAbsolute(command.cwd ?? '.')) throw new Error('Command cwd must be project-relative.');
  const cwd = await realpath(resolve(root, command.cwd ?? '.'));
  if (!inside(root, cwd)) throw new Error('Command cwd must resolve inside the selected project.');
  const destination = resolve(receipt);
  // Preflight common storage failures before running. Concurrent publication can still race.
  try { await lstat(destination); throw Object.assign(new Error('Receipt destination already exists.'), { code: 'EEXIST' }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parent = await realpath(dirname(destination));
  if (!(await stat(parent)).isDirectory()) throw new Error('Receipt parent must be a directory.');
  await access(parent, constants.W_OK | constants.X_OK);
  if (dryRun) {
    const sanitized = text => (command.redact ?? []).reduce((value, secret) => value.split(secret).join('[REDACTED]'), text);
    return { dryRun: true, scope: 'execution-preview', commandId, argv: command.argv.map(sanitized), cwd: sanitized(cwd),
      envKeys: Object.keys(command.env ?? {}), receipt: destination,
      timeoutMs: command.timeoutMs ?? 30000, maxOutputBytes: command.maxOutputBytes ?? 65536 };
  }
  const observation = await runCommand({ ...command, cwd, signal });
  try { await saveReceipt(destination, observation); }
  catch (error) {
    throw Object.assign(new Error(`Command ended (${observation.outcome}), but receipt could not be saved. Inspect the destination before retrying storage; do not automatically rerun the command.`), {
      code: 'RECEIPT_SAVE_FAILED', cause: error,
    });
  }
  return { scope: 'process-execution-only', feature: contract.id, commandId,
    receipt: destination, outcome: observation.outcome, exitCode: observation.exitCode,
    outputComplete: observation.outputComplete, outputTruncated: observation.stdout.truncated || observation.stderr.truncated,
    inputsBound: false, freshnessChecked: false };
}
