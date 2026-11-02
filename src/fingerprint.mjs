import { createHash } from 'node:crypto';
import { lstat, open, opendir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, posix } from 'node:path';

const defaults = { maxEntries: 10000, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024 };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ordered = values => [...new Set(values)].sort();
function selection(values, name, nonempty) {
  if (!Array.isArray(values) || (nonempty && !values.length) || values.length > 10000) throw new TypeError(`${name} must be a bounded array of project-relative paths.`);
  return ordered(values.map(value => {
    if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.split('/').includes('..')) throw new TypeError(`${name} must contain relative paths without traversal or backslashes.`);
    return posix.normalize(value).replace(/\/$/, '') || '.';
  }));
}

/** Hash selected on-disk bytes. This is neither a whole-project assertion nor an atomic snapshot. */
export async function fingerprintInputs(project, { paths, exclude = [], limits = {} } = {}) {
  const selected = selection(paths, 'paths', true), excluded = selection(exclude, 'exclude', false);
  if (!limits || typeof limits !== 'object' || Array.isArray(limits) || Object.keys(limits).some(k => !Object.hasOwn(defaults, k))) throw new TypeError('Unknown fingerprint limit.');
  const bounds = { ...defaults, ...limits };
  for (const key of Object.keys(defaults)) if (!Number.isInteger(bounds[key]) || bounds[key] < 1 || bounds[key] > defaults[key]) throw new TypeError(`${key} must be within the supported limit.`);
  const root = await realpath(project);
  if (!(await stat(root)).isDirectory()) throw new TypeError('Project must be a directory.');
  const ignored = path => path.split('/').includes('.git') || excluded.some(e => e === '.' || path === e || path.startsWith(`${e}/`));
  for (const path of selected) if (ignored(path)) throw new Error(`Selected path is excluded: ${path}`);
  const files = [], visited = new Set(); let total = 0, entries = 0;
  const changed = () => Object.assign(new Error('An input changed while being fingerprinted; retry on stable inputs.'), { code: 'INPUT_CHANGED' });
  const same = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs && a.mode === b.mode;
  async function walk(path) {
    if (ignored(path) || visited.has(path)) return;
    visited.add(path);
    if (++entries > bounds.maxEntries) throw new RangeError('Fingerprint entry limit exceeded.');
    const absolute = join(root, path), before = await lstat(absolute, { bigint: true });
    if (before.isSymbolicLink()) throw new TypeError(`Symlink inputs are unsupported: ${path}`);
    if (before.isDirectory()) {
      const directory = await opendir(absolute);
      for await (const child of directory) {
        if (child.name.includes('\\')) throw new TypeError('Backslash filenames are unsupported.');
        await walk(path === '.' ? child.name : `${path}/${child.name}`);
      }
      if (!same(before, await lstat(absolute, { bigint: true }))) throw changed();
      return;
    }
    if (!before.isFile()) throw new TypeError(`Input is not a regular file: ${path}`);
    if (before.size > BigInt(bounds.maxFileBytes)) throw new RangeError('Fingerprint file size limit exceeded.');
    const handle = await open(absolute, 'r');
    let bytes = 0; const digest = createHash('sha256');
    try {
      if (!same(before, await handle.stat({ bigint: true }))) throw changed();
      const buffer = Buffer.alloc(65536);
      for (;;) {
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        bytes += bytesRead; total += bytesRead;
        if (bytes > bounds.maxFileBytes || total > bounds.maxTotalBytes) throw new RangeError('Fingerprint byte limit exceeded.');
        digest.update(buffer.subarray(0, bytesRead));
      }
      if (BigInt(bytes) !== before.size || !same(before, await handle.stat({ bigint: true })) || !same(before, await lstat(absolute, { bigint: true }))) throw changed();
    } finally { await handle.close(); }
    files.push({ path, bytes, sha256: digest.digest('hex'), executable: Boolean(before.mode & 0o111n) });
  }
  // Reject symlink ancestors, including paths selected below a linked directory.
  for (const path of selected) {
    let parent = '';
    for (const segment of path.split('/').slice(0, -1)) {
      parent = parent ? `${parent}/${segment}` : segment;
      if ((await lstat(join(root, parent))).isSymbolicLink()) throw new TypeError('Symlink input ancestors are unsupported.');
    }
    await walk(path);
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const snapshot = { version: 1, algorithm: 'sha256', scope: 'selected-files', paths: selected, exclude: excluded, files };
  return { ...snapshot, digest: hash(JSON.stringify(snapshot)) };
}
