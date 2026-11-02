import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { realpath, open, stat } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { featureEvidence, readEvidenceInput, resolveEvidencePath } from './evidence.mjs';
import { readReceipt } from './receipts.mjs';
import { fingerprintInputs } from './fingerprint.mjs';

const ajv = new Ajv2020({ strict: true, allErrors: true });
const reviewShape = ajv.compile(JSON.parse(readFileSync(new URL('../schemas/review-v1.schema.json', import.meta.url), 'utf8')));
const hashSnapshot = s => createHash('sha256').update(JSON.stringify({ version: s.version, algorithm: s.algorithm,
  scope: s.scope, paths: s.paths, exclude: s.exclude, files: s.files.map(f => ({ path: f.path, bytes: f.bytes, sha256: f.sha256, executable: f.executable })) })).digest('hex');

/** Declared readiness policy, never approval or proof of adequate assertions/review. */
export async function featureReadiness(file, { project, review } = {}) {
  const evidence = await featureEvidence(file, { project });
  const gates = {
    planning: { state: evidence.structural.ok ? 'ready' : 'blocked', diagnostics: evidence.structural.diagnostics },
    execution: { state: evidence.ok ? 'ready' : 'blocked', summary: evidence.summary, policy: evidence.policy, inputsStable: evidence.inputsStable },
    review: { state: 'blocked', reasons: [] },
  };
  const result = { ok: false, scope: 'declared-readiness-policy', feature: evidence.feature, gates,
    evidence, approvalGranted: false, reviewClaimsVerified: false, authenticityChecked: false, assertionCoverageChecked: false };
  const block = (code, message) => gates.review.reasons.push({ code, message });
  if (!review) { block('REVIEW_MISSING', 'Supply an explicit structured review record.'); return result; }
  if (!evidence.ok) { block('EVIDENCE_NOT_READY', 'Resolve planning and execution evidence before evaluating review readiness.'); return result; }
  const root = await realpath(project), manifestFile = await realpath(file);
  const local = p => relative(root, p).split(sep).join('/');
  try {
    const recordPath = await resolveEvidencePath(root, review);
    const loaded = await readEvidenceInput(recordPath), record = loaded.value;
    if (!reviewShape(record)) { block('REVIEW_INVALID', 'Review does not match schema v1.'); return result; }
    const manifest = await readEvidenceInput(manifestFile);
    if (record.feature !== manifest.value.feature) block('REVIEW_FEATURE', 'Review names a different feature.');
    if (record.outcome !== 'no-findings' || record.coverage !== 'complete') block('REVIEW_INCOMPLETE', 'Review must declare no findings and complete coverage.');
    if (record.findings.some(f => !f.resolved)) block('REVIEW_FINDINGS', 'Unresolved findings remain.');
    if (new Set(record.findings.map(f => f.id)).size !== record.findings.length) block('REVIEW_INVALID', 'Finding IDs must be unique.');
    const reportPath = await resolveEvidencePath(root, record.report);
    if (reportPath === recordPath) block('REVIEW_INVALID', 'Review report and record must be separate files.');
    const report = await readEvidenceInputText(reportPath);
    if (!report.trim()) block('REVIEW_REPORT_EMPTY', 'The linked review report is empty.');
    const snapshot = record.inputs;
    if (hashSnapshot(snapshot) !== snapshot.digest) block('REVIEW_DIGEST', 'Review input digest is inconsistent.');
    const required = new Set([local(manifestFile), manifest.value.feature, '.tracecraft/config.json', record.report]);
    for (const check of manifest.value.checks) {
      if (!check.receipt) { block('EVIDENCE_CHANGED', 'Required receipt selection changed.'); continue; }
      const receipt = await readReceipt(await resolveEvidencePath(root, check.receipt));
      required.add(check.receipt);
      for (const input of receipt.binding?.before.files ?? []) required.add(input.path);
    }
    const reviewed = new Set(snapshot.files.map(f => f.path));
    if ([...required].some(p => !reviewed.has(p))) block('REVIEW_SCOPE', 'Review fingerprint must include the manifest, feature, configuration, linked report, selected receipts and every execution input file.');
    const current = await fingerprintInputs(root, { paths: snapshot.paths, exclude: snapshot.exclude });
    if (current.digest !== snapshot.digest) block('REVIEW_STALE', 'Reviewed inputs differ from current files.');
    if ((await readEvidenceInput(recordPath)).hash !== loaded.hash || (await readEvidenceInput(manifestFile)).hash !== manifest.hash) block('REVIEW_INPUTS_CHANGED', 'Review record or evidence manifest changed during evaluation.');
    // Re-evaluate execution after review comparison to detect changes during this assessment.
    const finalEvidence = await featureEvidence(file, { project });
    if (!finalEvidence.ok) {
      gates.planning = { state: finalEvidence.structural.ok ? 'ready' : 'blocked', diagnostics: finalEvidence.structural.diagnostics };
      gates.execution = { state: 'blocked', summary: finalEvidence.summary, policy: finalEvidence.policy, inputsStable: finalEvidence.inputsStable };
      result.evidence = finalEvidence;
      block('EVIDENCE_CHANGED', 'Execution evidence changed during readiness evaluation.');
    }
  } catch (error) { block('REVIEW_UNAVAILABLE', `Review could not be fully evaluated (${error.code ?? 'INVALID_INPUT'}).`); }
  gates.review.state = gates.review.reasons.length ? 'blocked' : 'ready';
  result.ok = Object.values(gates).every(g => g.state === 'ready');
  return result;
}

// Bounded non-JSON report read; reports are never interpreted as executable instructions.
async function readEvidenceInputText(file) {
  if (!(await stat(file)).isFile()) throw new TypeError('Report must be a file.');
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(1048577); let used = 0;
    while (used < bytes.length) { const { bytesRead } = await handle.read(bytes, used, bytes.length - used, null); if (!bytesRead) break; used += bytesRead; }
    if (used > 1048576) throw new RangeError('Review report exceeds 1 MiB.');
    return bytes.subarray(0, used).toString('utf8');
  } finally { await handle.close(); }
}
