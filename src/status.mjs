import { realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readReceipt } from './receipts.mjs';
import { fingerprintInputs } from './fingerprint.mjs';

function changes(before, current) {
  const previous = new Map(before.files.map(f => [f.path, f]));
  const now = new Map(current.files.map(f => [f.path, f]));
  return {
    added: [...now.keys()].filter(p => !previous.has(p)).sort(),
    removed: [...previous.keys()].filter(p => !now.has(p)).sort(),
    modified: [...now.keys()].filter(p => {
      const a = previous.get(p), b = now.get(p);
      return a && (a.sha256 !== b.sha256 || a.bytes !== b.bytes || a.executable !== b.executable);
    }).sort(),
  };
}

/** Read-only comparison, not authentication, test coverage or release approval. */
export async function receiptStatus(file, { project } = {}) {
  if (!project) throw new TypeError('An explicit project directory is required.');
  const root = await realpath(project);
  if (!(await stat(root)).isDirectory()) throw new TypeError('Project must be a directory.');
  const receipt = await readReceipt(file), o = receipt.observation;
  const reasons = [];
  const executionComplete = o.outputComplete && o.errorCode === null;
  if (o.outcome !== 'exited-zero') reasons.push({ code: 'EXECUTION_UNSUCCESSFUL', message: `Recorded execution outcome is ${o.outcome}.` });
  if (!executionComplete) reasons.push({ code: 'EXECUTION_INCOMPLETE', message: 'Output draining or process cleanup was incomplete or reported an error.' });
  const report = { ok: false, scope: 'selected-inputs-only', receipt: resolve(file), project: root,
    receiptVersion: receipt.schemaVersion,
    execution: { outcome: o.outcome, exitCode: o.exitCode, complete: executionComplete,
      outputTruncated: o.stdout.truncated || o.stderr.truncated, errorCode: o.errorCode },
    freshness: 'unbound', compared: false, changes: null, reasons,
    assertionCoverageChecked: false, authenticityChecked: false };
  if (receipt.schemaVersion === 1) {
    reasons.push({ code: 'UNBOUND_RECEIPT', message: 'V1 receipts have no input binding; current files cannot establish past execution inputs.' });
    return report;
  }
  const b = receipt.binding;
  Object.assign(report, { featurePath: b.featurePath, commandId: b.commandId, runInputState: b.state });
  if (b.state !== 'unchanged') {
    report.freshness = 'unstable-run';
    reasons.push({ code: 'RUN_INPUTS_UNSTABLE', message: `The original run's input comparison was ${b.state}; restoring files cannot repair that observation.` });
    return report;
  }
  try {
    const current = await fingerprintInputs(root, { paths: b.before.paths, exclude: b.before.exclude });
    report.compared = true;
    report.changes = changes(b.before, current);
    report.freshness = current.digest === b.before.digest ? 'current' : 'stale';
    if (report.freshness === 'stale') reasons.push({ code: 'INPUTS_CHANGED', message: 'Selected inputs differ from the recorded execution inputs.' });
  } catch (error) {
    report.freshness = 'unavailable';
    reasons.push({ code: 'INPUT_SCAN_FAILED', errorCode: error.code ?? 'FINGERPRINT_FAILED', message: 'Selected inputs could not be fully fingerprinted. No freshness claim is available.' });
  }
  report.ok = report.freshness === 'current' && o.outcome === 'exited-zero' && executionComplete;
  return report;
}
