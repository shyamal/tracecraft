const groups = ['requirements', 'decisions', 'tasks', 'tests'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = value => Array.isArray(value) && value.every(text);
const idPattern = /^(REQ|ADR|TASK|TEST)-[0-9]{3,}$/;
const prefixes = { requirements: 'REQ-', decisions: 'ADR-', tasks: 'TASK-', tests: 'TEST-' };
export const stages = ['specify', 'architect', 'plan'];
const coverageGroups = { specify: [], architect: ['decisions'], plan: groups.slice(1) };

export function draft(id) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id ?? '')) {
    throw new Error('Feature ID must contain lowercase words separated by hyphens.');
  }
  return { schemaVersion: 1, id, title: id.replaceAll('-', ' '),
    requirements: [], decisions: [], tasks: [], tests: [] };
}

/** Structural validation only. No application tests or filesystem reads occur here. */
export function validate(contract, { stage = 'plan' } = {}) {
  if (!stages.includes(stage)) throw new Error(`Unknown stage ${stage}; use specify, architect or plan.`);
  const diagnostics = [];
  const add = (code, message) => diagnostics.push({ code, message });
  if (!object(contract)) return [{ code: 'SHAPE', message: 'Contract must be a JSON object.' }];
  if (contract.schemaVersion !== 1) add('VERSION', 'Set schemaVersion to supported version 1; migrate unsupported versions explicitly.');
  if (!text(contract.id) || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(contract.id)) add('SHAPE', 'id must be a lowercase hyphenated feature ID.');
  if (!text(contract.title)) add('SHAPE', 'title must be nonempty text.');
  for (const group of groups) {
    if (!Array.isArray(contract[group])) add('SHAPE', `${group} must be an array.`);
  }
  // Do not traverse malformed containers.
  if (diagnostics.length) return diagnostics;
  if (!contract.requirements.length) add('EMPTY', 'Add at least one real requirement before checking coverage.');
  const nodes = new Map();
  for (const group of groups) {
    for (const [index, node] of contract[group].entries()) {
      const label = `${group}[${index}]`;
      if (!object(node)) { add('SHAPE', `${label} must be an object.`); continue; }
      if (!text(node.id) || !idPattern.test(node.id) || !node.id.startsWith(prefixes[group])) {
        add('ID', `${label}.id must use ${prefixes[group]} followed by at least three digits.`);
      } else if (nodes.has(node.id)) {
        add('DUPLICATE', `${node.id} is duplicated; IDs must be unique.`);
      } else nodes.set(node.id, node);
      if (group === 'requirements') {
        if (!text(node.statement)) add('SHAPE', `${label}.statement must be nonempty text.`);
        if (!strings(node.acceptance) || !node.acceptance.length) add('SHAPE', `${label}.acceptance needs at least one nonempty criterion.`);
      } else {
        if (!text(node.summary)) add('SHAPE', `${label}.summary must be nonempty text.`);
        if (!strings(node.requirementIds) || !node.requirementIds.length) add('SHAPE', `${label}.requirementIds needs at least one requirement ID.`);
        if (node.dependsOn !== undefined && !strings(node.dependsOn)) add('SHAPE', `${label}.dependsOn must be an array of IDs.`);
      }
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
  if (diagnostics.some(item => item.code === 'REFERENCE')) return diagnostics;
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
  if (!edges.has(changed)) throw new Error(`Unknown node ${changed}; choose an ID present in the contract.`);
  const affected = new Set();
  const queue = [changed];
  for (let i = 0; i < queue.length; i++) {
    for (const id of edges.get(queue[i])) {
      if (!affected.has(id)) { affected.add(id); queue.push(id); }
    }
  }
  return [...affected].sort();
}
