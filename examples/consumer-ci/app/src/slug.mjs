export function slug(label) {
  if (typeof label !== 'string') throw new TypeError('Label must be text');
  const result = label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!result) throw new Error('Label must contain an ASCII letter or digit');
  return result;
}
