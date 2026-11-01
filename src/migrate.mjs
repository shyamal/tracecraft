import { validate } from './contract.mjs';

function reject(message, diagnostics = []) {
  throw Object.assign(new Error(message), { code: 'MIGRATION', exitCode: 1, diagnostics });
}

/** Preserve the source and all existing node IDs; never infer criterion coverage. */
export function migrateV1(contract) {
  if (contract?.schemaVersion !== 1) reject('Migration accepts schemaVersion 1 only; v2 files need no conversion.');
  const diagnostics = validate(contract, { stage: 'specify' });
  if (diagnostics.length) reject('Repair invalid v1 structure or references before migration.', diagnostics);
  if (Object.hasOwn(contract, 'assumptions') || contract.requirements.some(req => Object.hasOwn(req, 'sources')) || contract.tests.some(test => Object.hasOwn(test, 'criterionIds'))) {
    reject('The v1 file has extension fields that conflict with v2 fields. Reconcile them manually; no fields were overwritten.');
  }
  const converted = structuredClone(contract);
  converted.schemaVersion = 2;
  converted.assumptions = [];
  let nextId = 1;
  for (const req of converted.requirements) {
    req.acceptance = req.acceptance.map(statement => ({ id: `AC-${String(nextId++).padStart(3, '0')}`, statement }));
    req.sources = [{ kind: 'legacy', reference: 'Imported from v1; original requirement source was not recorded.' }];
  }
  for (const test of converted.tests) test.criterionIds = [];
  const outputErrors = validate(converted, { stage: 'specify' });
  if (outputErrors.length) reject('Some v1 extension fields are not supported by v2. Reconcile them explicitly; no output was written.', outputErrors);
  return {
    contract: converted,
    warnings: [
      'Requirement sources are marked legacy; replace them with verified references where available.',
      'Test criterionIds are empty. Inspect assertions and map real coverage before the plan check can pass.',
      'Companion Markdown was not migrated. Update ordinal criterion references to the new stable IDs.',
    ],
    planDiagnostics: validate(converted, { stage: 'plan' }),
  };
}
