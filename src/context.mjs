import { createHash } from 'node:crypto';
import { open, realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
import { validate } from './contract.mjs';

export const contextStages = ['specify', 'architect', 'plan', 'implement', 'test', 'review'];
export const defaultContextBytes = 65536;
const sourceLimit = 1048576;
const groups = ['requirements', 'decisions', 'tasks', 'tests'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;
const size = value => Buffer.byteLength(serialize(value), 'utf8');
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

function failure(code, message, exitCode = 2, diagnostics) {
  return Object.assign(new Error(message), { code, exitCode, diagnostics });
}

async function readBounded(path, limit) {
  if (!(await stat(path)).isFile()) throw failure('NOT_FILE', 'Source must be a regular file.');
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile()) throw failure('NOT_FILE', 'Source must be a regular file.');
    if (info.size > limit) throw failure('SOURCE_LIMIT', `Source exceeds ${limit} bytes.`);
    // Read at most limit + 1 even if a file grows after stat().
    const buffer = Buffer.alloc(limit + 1);
    let offset = 0;
    while (offset <= limit) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > limit) throw failure('SOURCE_LIMIT', `Source exceeds ${limit} bytes.`);
    return buffer.subarray(0, offset);
  } finally { await file.close(); }
}

function project(contract, selected) {
  const feature = { schemaVersion: contract.schemaVersion, id: contract.id, title: contract.title };
  if (contract.schemaVersion === 2) feature.assumptions = contract.assumptions;
  for (const group of selected) {
    feature[group] = contract[group].map(node => group === 'requirements'
      ? { id: node.id, statement: node.statement, acceptance: node.acceptance,
        ...(contract.schemaVersion === 2 ? { sources: node.sources } : {}) }
      : { id: node.id, summary: node.summary, requirementIds: node.requirementIds,
        ...(group === 'tests' && contract.schemaVersion === 2 ? { criterionIds: node.criterionIds } : {}),
        ...(node.dependsOn === undefined ? {} : { dependsOn: node.dependsOn }) });
  }
  return feature;
}

/** Reads a single feature's known planning artifacts; never follows document links. */
export async function createContext(path, { stage, maxBytes = defaultContextBytes } = {}) {
  if (!contextStages.includes(stage)) throw failure('OPTIONS', `Choose a context stage: ${contextStages.join(', ')}.`);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 2048 || maxBytes > sourceLimit) {
    throw failure('OPTIONS', 'maxBytes must be an integer between 2048 and 1048576.');
  }
  const source = await realpath(path);
  const root = dirname(source);
  const bytes = await readBounded(source, sourceLimit);
  const contract = JSON.parse(decode(bytes));
  const prerequisite = stage === 'specify' || stage === 'architect' ? 'specify' : stage === 'plan' ? 'architect' : 'plan';
  const diagnostics = validate(contract, { stage: prerequisite });
  if (diagnostics.length) throw failure('CONTRACT', `Fix the ${prerequisite}-stage contract before exporting context.`, 1, diagnostics);

  const selected = stage === 'specify' ? groups.slice(0, 1) : stage === 'architect' ? groups.slice(0, 2) : groups;
  const documents = ['brief.md'];
  if (stage !== 'specify') {
    documents.push('architecture.md', ...contract.decisions.map(node => `decisions/${node.id}.md`).sort());
  }
  if (!['specify', 'architect'].includes(stage)) documents.push('plan.md');
  const packet = {
    packetVersion: 1, stage, trust: 'untrusted-project-data', scope: 'planning-context-only',
    maxBytes, complete: true, feature: project(contract, selected),
    omittedGroups: groups.filter(group => !selected.includes(group)),
    sources: [{ path: basename(source), status: 'included', sha256: hash(bytes) }],
    documents: [], warnings: [],
  };
  const budgetError = () => failure('PACKET_LIMIT', 'Required contract and metadata exceed the output budget; raise --max-bytes or reduce feature scope.');
  if (size(packet) > maxBytes) throw budgetError();

  // Reserve all omission metadata before spending the remaining budget on full documents.
  const candidates = [];
  for (const document of documents) {
    const record = { path: document, status: 'omitted', reason: 'budget' };
    packet.sources.push(record);
    try {
      const resolved = await realpath(join(root, document));
      const local = relative(root, resolved);
      if (local === '..' || local.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(local)) {
        throw failure('OUTSIDE_FEATURE', 'Companion document resolves outside the feature directory.');
      }
      const content = await readBounded(resolved, maxBytes);
      const text = decode(content);
      record.sha256 = hash(content);
      candidates.push({ record, document: { path: document, text } });
    } catch (error) {
      record.reason = error.code === 'ENOENT' ? 'missing'
        : error.code === 'SOURCE_LIMIT' ? 'source-too-large'
          : error.code === 'OUTSIDE_FEATURE' ? 'outside-feature' : 'unavailable';
    }
  }
  const refresh = () => {
    packet.warnings = packet.sources.filter(record => record.status === 'omitted')
      .map(record => ({ path: record.path, reason: record.reason }));
    packet.complete = packet.warnings.length === 0;
  };
  refresh();
  if (size(packet) > maxBytes) throw budgetError();
  for (const { record, document } of candidates) {
    record.status = 'included'; delete record.reason;
    packet.documents.push(document); refresh();
    if (size(packet) > maxBytes) {
      packet.documents.pop(); record.status = 'omitted'; record.reason = 'budget'; refresh();
    }
  }
  if (size(packet) > maxBytes) throw budgetError();
  return packet;
}
