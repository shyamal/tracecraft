import { createHash } from 'node:crypto';
import { open, realpath, stat } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { createContext } from './context.mjs';
import { featureEvidence, readEvidenceInput, resolveEvidencePath } from './evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const size = value => Buffer.byteLength(`${JSON.stringify(value, null, 2)}\n`);
async function bytes(file, limit) {
  if (!(await stat(file)).isFile()) throw new TypeError('Packet input must be a regular file.');
  const handle = await open(file, 'r');
  try {
    const data = Buffer.alloc(limit + 1); let used = 0;
    while (used < data.length) { const { bytesRead } = await handle.read(data, used, data.length - used, null); if (!bytesRead) break; used += bytesRead; }
    if (used > limit) throw new RangeError('Packet source exceeds its byte limit.');
    return data.subarray(0, used);
  } finally { await handle.close(); }
}

/** Export selected review material only; never execute diff text or follow its paths. */
export async function reviewPacket(file, { project, diff, maxBytes = 262144 } = {}) {
  if (!project || !diff) throw new TypeError('Explicit project and project-relative diff file are required.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 4096 || maxBytes > 1048576) throw new TypeError('maxBytes must be between 4096 and 1048576.');
  const root = await realpath(project), manifestFile = await realpath(file);
  const manifest = await readEvidenceInput(manifestFile);
  const evidence = await featureEvidence(file, { project });
  if (!evidence.structural.ok) throw Object.assign(new Error('A plan-valid feature is required for a review packet.'), { code: 'CONTRACT', exitCode: 1, diagnostics: evidence.structural.diagnostics });
  const featureFile = await resolveEvidencePath(root, manifest.value.feature);
  const diffFile = await resolveEvidencePath(root, diff), diffBytes = await bytes(diffFile, 1048576);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(diffBytes);
  const context = await createContext(featureFile, { stage: 'review', maxBytes });
  const checks = evidence.checks.map(check => ({ commandId: check.commandId, testIds: check.testIds, receipt: check.receipt,
    state: check.state, ...(check.reason ? { reason: check.reason } : {}), ...(check.status ? { status: {
      freshness: check.status.freshness, execution: check.status.execution, reasons: check.status.reasons,
    } } : {}) }));
  const packet = { packetVersion: 1, trust: 'untrusted-project-data', scope: 'selected-review-material', maxBytes,
    complete: false, diffValidatedAgainstCheckout: false, reviewPerformed: false,
    context, diff: { path: diff, sha256: hash(diffBytes), text },
    evidence: { ok: evidence.ok, structural: evidence.structural, policy: evidence.policy,
      summary: evidence.summary, inputsStable: evidence.inputsStable, checks },
    sources: [{ path: relative(root, manifestFile).split(sep).join('/'), role: 'manifest', sha256: manifest.hash },
      { path: diff, role: 'diff', sha256: hash(diffBytes) }],
    omittedMaterial: ['full-receipt-content', 'implementation-notes', 'verification-narratives', 'prior-review-reports', 'surrounding-application-code'],
    warnings: [],
  };
  const sourceWarnings = [];
  const seen = new Set();
  for (const check of manifest.value.checks) {
    if (!check.receipt || seen.has(check.receipt)) continue;
    seen.add(check.receipt);
    try {
      const receiptBytes = await bytes(await resolveEvidencePath(root, check.receipt), 16777216);
      packet.sources.push({ path: check.receipt, role: 'receipt-metadata-only', sha256: hash(receiptBytes) });
    } catch { sourceWarnings.push({ code: 'RECEIPT_SOURCE_UNAVAILABLE', path: check.receipt }); }
  }
  const refresh = () => {
    context.warnings = context.sources.filter(s => s.status === 'omitted').map(s => ({ path: s.path, reason: s.reason }));
    context.complete = context.warnings.length === 0;
    packet.warnings = [
      { code: 'DIFF_SCOPE_UNVERIFIED', message: 'Diff is caller-selected text; compare it with the intended revisions/working tree and inspect surrounding code.' },
      { code: 'MATERIAL_NOT_INCLUDED', message: 'Receipt bodies and additional reports/code must be read separately when needed.' },
      ...sourceWarnings,
      ...context.warnings.map(w => ({ code: 'PLANNING_DOCUMENT_OMITTED', ...w })),
      ...(!evidence.ok ? [{ code: 'EVIDENCE_NOT_READY', message: 'Required evidence is missing, unusable, or its mapping is invalid.' }] : []),
      ...(!text.trim() ? [{ code: 'EMPTY_DIFF', message: 'The selected diff file is empty.' }] : []),
    ];
    // Complete means selected contract/diff/metadata and all selected planning documents fit, not review readiness.
    packet.complete = context.complete && !sourceWarnings.length;
  };
  refresh();
  while (size(packet) > maxBytes && context.documents.length) {
    const omitted = context.documents.pop();
    const source = context.sources.find(s => s.path === omitted.path);
    source.status = 'omitted'; source.reason = 'packet-budget'; refresh();
  }
  if (size(packet) > maxBytes) throw Object.assign(new Error('Required contract, diff and evidence metadata exceed the packet budget.'), { code: 'PACKET_LIMIT' });
  if ((await readEvidenceInput(manifestFile)).hash !== manifest.hash || hash(await bytes(diffFile, 1048576)) !== packet.diff.sha256 || hash(await bytes(featureFile, 1048576)) !== context.sources[0].sha256) {
    throw Object.assign(new Error('Manifest, contract or diff changed during export; retry on stable inputs.'), { code: 'INPUT_CHANGED' });
  }
  return packet;
}
