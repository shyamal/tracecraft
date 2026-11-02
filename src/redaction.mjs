// Shared preview/execution semantics; this is literal replacement, not secret detection.
export function createLiteralRedactor(redact = []) {
  if (!Array.isArray(redact) || redact.length > 100 || redact.some(v => typeof v !== 'string' || !v || Buffer.byteLength(v) > 4096)) throw new TypeError('redact must contain at most 100 nonempty literals of at most 4096 bytes.');
  const secrets = [...new Set(redact)].sort((a, b) => b.length - a.length);
  // One pass prevents replacement markers being reprocessed as secrets.
  const pattern = secrets.length ? new RegExp(secrets.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
  return text => pattern ? text.replace(pattern, '[REDACTED]') : text;
}
