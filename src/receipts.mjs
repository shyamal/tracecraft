import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { open, link, unlink, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const ajv = new Ajv2020({ strict: true, allErrors: true });
const shape = ajv.compile(JSON.parse(readFileSync(new URL('../schemas/receipt-v1.schema.json', import.meta.url), 'utf8')));
export const MAX_RECEIPT_BYTES = 16 * 1024 * 1024;

/** Validity is not authenticity, assertion coverage or freshness. */
export function validateReceipt(receipt) {
  if (!shape(receipt)) return shape.errors.map(e => ({ code: 'RECEIPT_SHAPE', path: e.instancePath || '/', message: e.message }));
  const o = receipt.observation, errors = [];
  const add = message => errors.push({ code: 'RECEIPT_OBSERVATION', message });
  for (const field of ['startedAt', 'endedAt']) {
    const value = o[field];
    if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) add(`${field} must be a canonical UTC timestamp.`);
  }
  // Wall clocks can move backwards; durationMs is monotonic runner time.
  if (o.outcome === 'exited-zero' && (o.exitCode !== 0 || o.signal !== null)) add('exited-zero requires exitCode 0 and no signal.');
  if (o.outcome === 'exited-nonzero' && (o.exitCode === null || o.exitCode === 0 || o.signal !== null)) add('exited-nonzero requires a nonzero exit code and no signal.');
  if (o.outcome === 'signalled' && (o.signal === null || o.exitCode !== null)) add('signalled requires a signal and no exit code.');
  if (o.outcome === 'spawn-error' && (o.errorCode === null || o.exitCode !== null || o.signal !== null)) add('spawn-error requires an error code and no exit code or signal.');
  for (const stream of ['stdout', 'stderr']) {
    if (Buffer.byteLength(o[stream].text) > 1048576) add(`${stream} exceeds the runner output limit.`);
  }
  return errors;
}

function checked(receipt) {
  const diagnostics = validateReceipt(receipt);
  if (diagnostics.length) throw Object.assign(new Error('Invalid execution receipt.'), { code: 'INVALID_RECEIPT', diagnostics });
  return receipt;
}

/** Save an observation without mutating it or replacing any existing destination. */
export async function saveReceipt(file, observation) {
  const receipt = checked({ schemaVersion: 1, kind: 'execution-receipt', observation });
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  if (bytes.length > MAX_RECEIPT_BYTES) throw new RangeError('Receipt exceeds the 16 MiB storage limit.');
  const destination = resolve(file), temporary = join(dirname(destination), `.tracecraft-receipt-${randomUUID()}.tmp`);
  let handle, created = false;
  try {
    handle = await open(temporary, 'wx', 0o600); created = true;
    await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = undefined;
    // Same-directory hard link publishes complete bytes atomically and refuses collisions.
    await link(temporary, destination);
  } finally {
    if (handle) await handle.close();
    if (created) await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { path: destination, bytes: bytes.length };
}

export async function readReceipt(file) {
  // Trusted local paths only; these checks are not race-proof filesystem confinement.
  const info = await lstat(file);
  if (!info.isFile()) throw new TypeError('Receipt must be a regular file, not a symlink or directory.');
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(MAX_RECEIPT_BYTES + 1);
    let used = 0;
    while (used < bytes.length) {
      const { bytesRead } = await handle.read(bytes, used, bytes.length - used, null);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used > MAX_RECEIPT_BYTES) throw new RangeError('Receipt exceeds the 16 MiB storage limit.');
    return checked(JSON.parse(bytes.subarray(0, used).toString('utf8')));
  } finally { await handle.close(); }
}
