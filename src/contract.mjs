import { validateShape } from './schema.mjs';

const groups = ['requirements', 'decisions', 'tasks', 'tests'];
export const stages = ['specify', 'architect', 'plan'];
const coverageGroups = { specify: [], architect: ['decisions'], plan: groups.slice(1) };

export function draft(id) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id ?? '')) {
    throw new Error('Feature ID must contain lowercase words separated by hyphens.');
  }
  return { schemaVersion: 2, id, title: id.replaceAll('-', ' '),
    requirements: [], decisions: [], tasks: [], tests: [], assumptions: [] };
}

/** Structural validation only; source statements and test execution are not verified. */
export function validate(contract, { stage = 'plan' } = {}) {
  if (!stages.includes(stage)) throw new Error(`Unknown stage ${stage}; use specify, architect or plan.`);
  const diagnostics = validateShape(contract);
  if (diagnostics.length) return diagnostics;
  const add = (code, message) => diagnostics.push({ code, message });
  if (!contract.requirements.length) add('EMPTY', 'Add at least one real requirement before checking coverage.');
  const nodes = new Map();
  for (const group of groups) {
    for (const node of contract[group]) {
      if (nodes.has(node.id)) add('DUPLICATE', `${node.id} is duplicated; IDs must be unique.`);
      else nodes.set(node.id, node);
    }
  }
  if (diagnostics.length) return diagnostics;
  const requirements = new Set(contract.requirements.map(node => node.id));
  for (const group of groups.slice(1)) {
    for (const node of contract[group]) {
      for (const id of node.requirementIds) {
        if (!requirements.has(id)) add('REFERENCE', `${node.id} refers to unknown requirement ${id}.`);
      }
      for (const id of node.dependsOn ?? []) {
        if (!nodes.has(id)) add('REFERENCE', `${node.id} depends on unknown node ${id}.`);
      }
    }
    for (const id of coverageGroups[stage].includes(group) ? requirements : []) {
      if (!contract[group].some(node => node.requirementIds.includes(id))) add('COVERAGE', `${id} has no ${group} mapping.`);
    }
  }
  if (contract.schemaVersion === 2) {
    const criteria = new Map(), assumptions = new Set();
    for (const assumption of contract.assumptions) {
      if (assumptions.has(assumption.id)) add('DUPLICATE', `${assumption.id} is duplicated.`);
      assumptions.add(assumption.id);
    }
    for (const req of contract.requirements) {
      for (const criterion of req.acceptance) {
        if (criteria.has(criterion.id)) add('DUPLICATE', `${criterion.id} is duplicated; criterion IDs must be unique across the feature.`);
        criteria.set(criterion.id, req.id);
      }
      for (const source of req.sources) {
        if (source.kind === 'assumption' && !assumptions.has(source.reference)) add('REFERENCE', `${req.id} refers to unknown assumption ${source.reference}.`);
      }
    }
    for (const test of contract.tests) {
      for (const id of test.criterionIds) {
        if (!criteria.has(id)) add('REFERENCE', `${test.id} refers to unknown criterion ${id}.`);
        else if (!test.requirementIds.includes(criteria.get(id))) add('REFERENCE', `${test.id} maps ${id} without its owning requirement ${criteria.get(id)}.`);
      }
      if (stage === 'plan') {
        for (const reqId of test.requirementIds) {
          if (!test.criterionIds.some(id => criteria.get(id) === reqId)) add('COVERAGE', `${test.id} needs a criterion mapping for ${reqId}; do not infer coverage from a test name.`);
        }
      }
    }
    if (stage === 'plan') {
      for (const id of criteria.keys()) {
        if (!contract.tests.some(test => test.criterionIds.includes(id))) add('COVERAGE', `${id} has no test specification mapping.`);
      }
    }
  }
  if (diagnostics.some(item => item.code === 'REFERENCE' || item.code === 'DUPLICATE')) return diagnostics;
  // Kahn's algorithm detects cycles without recursion or stack-depth limits.
  const edges = graph(contract);
  const degree = new Map([...nodes.keys()].map(id => [id, 0]));
  for (const children of edges.values()) for (const id of children) degree.set(id, degree.get(id) + 1);
  const queue = [...degree].filter(([, n]) => n === 0).map(([id]) => id);
  for (let index = 0; index < queue.length; index++) {
    for (const id of edges.get(queue[index])) {
      degree.set(id, degree.get(id) - 1);
      if (degree.get(id) === 0) queue.push(id);
    }
  }
  if (queue.length !== nodes.size) add('CYCLE', 'Dependency graph contains a cycle; remove circular dependsOn references.');
  return diagnostics;
}

function graph(contract) {
  const edges = new Map(groups.flatMap(group => contract[group]).map(node => [node.id, new Set()]));
  for (const group of groups.slice(1)) {
    for (const node of contract[group]) {
      for (const dependency of [...node.requirementIds, ...(node.dependsOn ?? [])]) edges.get(dependency).add(node.id);
    }
  }
  return edges;
}

export function impact(contract, changed) {
  const diagnostics = validate(contract);
  if (diagnostics.length) throw new Error('Fix contract validation errors before computing impact.');
  const edges = graph(contract);
  let seeds = edges.has(changed) ? [changed] : null;
  if (contract.schemaVersion === 2 && !seeds) {
    const owner = contract.requirements.find(req => req.acceptance.some(criterion => criterion.id === changed));
    if (owner) seeds = [owner.id];
    else if (contract.assumptions.some(item => item.id === changed)) seeds = contract.requirements
      .filter(req => req.sources.some(source => source.kind === 'assumption' && source.reference === changed)).map(req => req.id);
  }
  if (!seeds) throw new Error(`Unknown node ${changed}; choose an ID present in the contract.`);
  const affected = new Set(seeds.filter(id => id !== changed));
  const queue = [...seeds];
  for (let i = 0; i < queue.length; i++) {
    for (const id of edges.get(queue[i])) {
      if (!affected.has(id)) { affected.add(id); queue.push(id); }
    }
  }
  return [...affected].sort();
}
