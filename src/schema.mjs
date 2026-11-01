import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validators = new Map([1, 2].map(version => [version,
  ajv.compile(JSON.parse(readFileSync(new URL(`../schemas/feature-v${version}.schema.json`, import.meta.url), 'utf8'))),
]));

/** Shape validation only. No coercion, defaults, property removal or remote schema loading. */
export function validateShape(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return [{ code: 'SHAPE', message: 'Contract must be a JSON object.' }];
  }
  const validator = validators.get(contract.schemaVersion);
  if (!validator) return [{ code: 'VERSION', message: 'Supported schemaVersion values are 1 and 2; migrate explicitly before using another version.' }];
  if (validator(contract)) return [];
  return validator.errors.map(error => ({
    code: error.instancePath.endsWith('/id') && error.keyword === 'pattern' ? 'ID' : 'SHAPE',
    path: error.instancePath || '/',
    message: `${error.instancePath || '/'} ${error.message}${error.params.missingProperty ? `: ${error.params.missingProperty}` : ''}${error.params.additionalProperty ? `: ${error.params.additionalProperty}` : ''}`,
  }));
}
