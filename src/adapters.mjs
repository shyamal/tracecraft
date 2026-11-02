import { readFile, writeFile, readdir, lstat, mkdir, unlink, realpath } from 'node:fs/promises';
import { resolve, dirname, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const names = ['tc-specify', 'tc-architect', 'tc-plan', 'tc-implement', 'tc-test', 'tc-review', 'tc-impact'];
const digest = data => createHash('sha256').update(data).digest('hex');
const links = /\]\(([^\s)]+)\)/g;
const localLink = target => !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target);
function layout(host) {
  if (!['codex', 'claude'].includes(host)) throw new Error('Host must be codex or claude');
  const skills = `${host === 'codex' ? '.agents' : '.claude'}/skills`;
  const base = `.tracecraft/adapters/${host}`;
  const map = path => names.some(name => path.startsWith(`skills/${name}/`))
    ? `${skills}/${path.slice(7)}` : `${base}/resources/${path}`;
  const allowed = path => typeof path === 'string' && !path.includes('\\') && path === posix.normalize(path)
    && !path.split('/').some(part => !part || part === '..' || part === '.')
    && (path.startsWith(`${base}/resources/`) || names.some(name => path.startsWith(`${skills}/${name}/`)));
  return { map, allowed, manifest: `${base}/manifest.json` };
}

// Reject symlinks within the canonical project root. Concurrent writers are unsupported.
async function safePath(root, path) {
  const full = resolve(root, path);
  if (!full.startsWith(`${root}${sep}`)) throw new Error(`Path outside project: ${path}`);
  const parts = path.split('/');
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    let stat;
    try { stat = await lstat(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory())) throw new Error(`Unsafe path: ${path}`);
  }
  return full;
}
async function bytes(root, path) {
  const full = await safePath(root, path);
  try {
    if (!(await lstat(full)).isFile()) throw new Error(`Expected regular file: ${path}`);
    return await readFile(full);
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function renderAdapter(host) {
  const { map } = layout(host);
  const pending = [];
  async function collect(dir) {
    for (const entry of await readdir(resolve(sourceRoot, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) pending.push(path);
      else throw new Error(`Unsupported source: ${path}`);
    }
  }
  for (const name of names) await collect(`skills/${name}`);
  const files = new Map();
  const seen = new Set();
  for (let i = 0; i < pending.length; i++) {
    const path = pending[i];
    if (seen.has(path)) continue;
    seen.add(path);
    if (path.startsWith('../') || posix.isAbsolute(path)) throw new Error(`Source link escapes toolkit: ${path}`);
    let data = await bytes(await realpath(sourceRoot), path);
    if (!data) throw new Error(`Missing linked resource: ${path}`);
    if (path.endsWith('.md')) {
      const rendered = data.toString('utf8').replace(links, (match, target) => {
        if (!localLink(target)) return match;
        const [file, ...fragment] = target.split('#');
        const linked = posix.normalize(posix.join(posix.dirname(path), file));
        pending.push(linked);
        const destination = posix.relative(posix.dirname(map(path)), map(linked));
        return `](${destination}${fragment.length ? '#' + fragment.join('#') : ''})`;
      });
      const note = path.endsWith('/SKILL.md') ? '\n\n## Installed adapter context\n\nThis project-local copy contains instructions and support documents only. Ask for or use the known absolute path to the Tracecraft CLI checkout; the resources bundle is not a runnable CLI. If unavailable, report validation as not run.\n' : '';
      data = Buffer.from(rendered + note);
    }
    files.set(map(path), data);
  }
  return files;
}

export async function manageAdapter(action, { host, project, dryRun = false }) {
  if (!['install', 'uninstall'].includes(action) || !project) throw new Error('Expected install/uninstall and explicit project');
  const selected = resolve(project);
  if (!(await lstat(selected)).isDirectory()) throw new Error('Project must be an existing directory');
  const root = await realpath(selected);
  const { manifest, allowed } = layout(host);
  const raw = await bytes(root, manifest);
  let owned = {};
  if (raw) {
    if (raw.length > 1024 * 1024) throw new Error('Installation manifest is too large');
    const record = JSON.parse(raw);
    if (record.schemaVersion !== 1 || record.host !== host || !record.files || Array.isArray(record.files) || typeof record.files !== 'object') throw new Error('Invalid installation manifest');
    for (const [path, hash] of Object.entries(record.files)) {
      if (!allowed(path) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid owned file entry');
    }
    owned = record.files;
  }
  const desired = action === 'install' ? await renderAdapter(host) : new Map();
  const created = [], removed = [], preserved = [], unchanged = [], conflicts = [];
  if (action === 'install') {
    for (const [path, data] of desired) {
      const existing = await bytes(root, path);
      if (existing === null) created.push(path);
      else if (Object.hasOwn(owned, path) && digest(existing) === owned[path] && existing.equals(data)) unchanged.push(path);
      else conflicts.push(path);
    }
    for (const path of Object.keys(owned)) if (!desired.has(path)) conflicts.push(path);
    // An existing manifest is immutable: upgrades require an explicit uninstall first.
    if (raw && Object.entries(owned).some(([path, hash]) => !desired.has(path) || digest(desired.get(path)) !== hash)) conflicts.push(manifest);
    if (raw && [...desired.keys()].some(path => !Object.hasOwn(owned, path))) conflicts.push(manifest);
  } else {
    for (const [path, hash] of Object.entries(owned)) {
      const existing = await bytes(root, path);
      if (existing === null) continue;
      if (digest(existing) === hash) removed.push(path); else preserved.push(path);
    }
  }
  const report = { ok: conflicts.length === 0 && preserved.length === 0, action, host, dryRun, created, removed, preserved, unchanged, conflicts: [...new Set(conflicts)], manifest, installed: raw !== null };
  if (dryRun || conflicts.length) return report;
  if (action === 'install') {
    const written = [];
    try {
      for (const path of created) {
        const full = await safePath(root, path);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, desired.get(path), { flag: 'wx' }); written.push(path);
      }
      if (!raw) {
        const full = await safePath(root, manifest);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, JSON.stringify({ schemaVersion: 1, host, files: Object.fromEntries([...desired].map(([path, data]) => [path, digest(data)])) }, null, 2) + '\n', { flag: 'wx' });
      }
    } catch (error) {
      for (const path of written.reverse()) {
        const current = await bytes(root, path);
        if (current?.equals(desired.get(path))) await unlink(await safePath(root, path));
      }
      throw error;
    }
  } else {
    for (const path of removed) {
      const current = await bytes(root, path);
      if (current && digest(current) !== owned[path]) throw new Error(`File changed during uninstall: ${path}`);
      if (current) await unlink(await safePath(root, path));
    }
    if (raw && !preserved.length) await unlink(await safePath(root, manifest));
  }
  return report;
}
