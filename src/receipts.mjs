import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { open, link, unlink, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const ajv = new Ajv2020({ strict: true, allErrors: true });
const shapes = new Map([1, 2].map(v => [v, ajv.compile(JSON.parse(readFileSync(new URL(`../schemas/receipt-v${v}.schema.json`, import.meta.url), 'utf8')))]));
export const MAX_RECEIPT_BYTES = 16 * 1024 * 1024;

/** Validity is not authenticity, assertion coverage or freshness. */
export function validateReceipt(receipt) {
  const shape = shapes.get(receipt?.schemaVersion);
  if (!shape) return [{ code: 'RECEIPT_VERSION', message: 'Unsupported receipt version.' }];
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
  if (receipt.schemaVersion === 2) {
    const b = receipt.binding;
    const safePath = p => p === '.' || (p && !p.startsWith('/') && !p.includes('\\') && !p.includes('\0') && !/^[A-Za-z]:/.test(p) && p.split('/').every(s => s && s !== '.' && s !== '..'));
    for (const snap of [b.before, b.after].filter(Boolean)) {
      const payload = { version: snap.version, algorithm: snap.algorithm, scope: snap.scope,
        paths: snap.paths, exclude: snap.exclude, files: snap.files.map(f => ({ path: f.path, bytes: f.bytes, sha256: f.sha256, executable: f.executable })) };
      if (createHash('sha256').update(JSON.stringify(payload)).digest('hex') !== snap.digest) add('Fingerprint digest does not match its manifest.');
      for (const list of [snap.paths, snap.exclude, snap.files.map(f => f.path)]) {
        if (list.some(p => !safePath(p)) || JSON.stringify(list) !== JSON.stringify([...new Set(list)].sort())) add('Fingerprint paths must be safe, unique and sorted.');
      }
      for (const f of snap.files) {
        if (!snap.paths.some(p => p === '.' || f.path === p || f.path.startsWith(`${p}/`)) || snap.exclude.some(p => p === '.' || f.path === p || f.path.startsWith(`${p}/`)) || f.path.split('/').includes('.git')) add('Fingerprint file is outside its declared scope.');
      }
    }
    if (![b.featurePath, b.configPath].every(safePath)) add('Binding paths must be project-relative.');
    if (![b.featurePath, b.configPath].every(p => b.before.files.some(f => f.path === p))) add('Before snapshot must include feature and configuration.');
    if (b.state === 'unavailable') {
      if (b.after !== null || !b.errorCode) add('Unavailable binding requires no after snapshot and an error code.');
    } else if (!b.after || b.errorCode !== null) add('Compared binding requires an after snapshot and no error code.');
    else {
      if (JSON.stringify(b.before.paths) !== JSON.stringify(b.after.paths) || JSON.stringify(b.before.exclude) !== JSON.stringify(b.after.exclude)) add('Before and after selections must match.');
      if ((b.before.digest === b.after.digest) !== (b.state === 'unchanged')) add('Binding state contradicts fingerprint comparison.');
    }
  }
  return errors;
}

function checked(receipt) {
  const diagnostics = validateReceipt(receipt);
  if (diagnostics.length) throw Object.assign(new Error('Invalid execution receipt.'), { code: 'INVALID_RECEIPT', diagnostics });
  return receipt;
}

/** Save an observation without mutating it or replacing any existing destination. */
export async function saveReceipt(file, observation, binding) {
  const receipt = checked(binding === undefined ? { schemaVersion: 1, kind: 'execution-receipt', observation } : { schemaVersion: 2, kind: 'execution-receipt', observation, binding });
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
