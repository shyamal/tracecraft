import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { performance } from 'node:perf_hooks';

// Execution observations only: callers still assess assertions and coverage.
export async function runCommand({ argv, cwd, env = {}, timeoutMs = 30000,
  maxOutputBytes = 65536, redact = [], signal } = {}) {
  if (process.platform === 'win32') throw new Error('Runner currently supports POSIX hosts only.');
  if (!Array.isArray(argv) || !argv.length || argv.some(v => typeof v !== 'string' || v.includes('\0')) || !argv[0]) throw new TypeError('argv must contain an executable and string arguments.');
  if (typeof cwd !== 'string' || !isAbsolute(cwd)) throw new TypeError('cwd must be an explicit absolute directory.');
  for (const [name, value, upper] of [['timeoutMs', timeoutMs, 3600000], ['maxOutputBytes', maxOutputBytes, 1048576]]) {
    if (!Number.isInteger(value) || value < 1 || value > upper) throw new TypeError(`${name} is out of range.`);
  }
  if (!env || typeof env !== 'object' || Array.isArray(env) || Object.entries(env).some(([k, v]) => !k || /[=\0]/.test(k) || typeof v !== 'string' || v.includes('\0'))) throw new TypeError('env must map valid names to strings.');
  if (!Array.isArray(redact) || redact.length > 100 || redact.some(v => typeof v !== 'string' || !v || Buffer.byteLength(v) > 4096)) throw new TypeError('redact must contain at most 100 nonempty literals of at most 4096 bytes.');
  if (signal !== undefined && !(signal instanceof AbortSignal)) throw new TypeError('signal must be an AbortSignal.');
  const directory = await realpath(cwd);
  if (!(await stat(directory)).isDirectory()) throw new TypeError('cwd must be a directory.');
  const secrets = [...new Set(redact)].sort((a, b) => b.length - a.length);
  // One pass prevents replacement markers being reprocessed as secrets.
  const pattern = secrets.length ? new RegExp(secrets.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
  const sanitize = text => pattern ? text.replace(pattern, '[REDACTED]') : text;
  const maxSecret = Math.max(0, ...secrets.map(s => Buffer.byteLength(s)));
  const captureLimit = maxOutputBytes + maxSecret;
  function capture() {
    const chunks = []; let kept = 0, seen = 0;
    return {
      add(chunk) { seen += chunk.length; const part = chunk.subarray(0, Math.max(0, captureLimit - kept)); if (part.length) { chunks.push(part); kept += part.length; } },
      result() {
        let bytes = Buffer.concat(chunks);
        const decoder = new StringDecoder('utf8');
        let text = decoder.write(bytes);
        if (seen <= kept) text += decoder.end();
        else {
          // Remove any incomplete secret at the capture boundary before redaction.
          let suffix = 0;
          for (const secret of secrets) {
            for (let n = 1; n < secret.length && n <= text.length; n++) {
              if (text.endsWith(secret.slice(0, n))) suffix = Math.max(suffix, n);
            }
          }
          if (suffix) text = text.slice(0, -suffix);
        }
        const clean = Buffer.from(sanitize(text));
        let end = Math.min(clean.length, maxOutputBytes);
        while (end > 0 && end < clean.length && (clean[end] & 0xc0) === 0x80) end--;
        return { text: clean.subarray(0, end).toString('utf8'), truncated: seen > kept || clean.length > end, observedBytes: seen };
      },
    };
  }
  const out = capture(), err = capture();
  const startedAt = new Date().toISOString(), start = performance.now();
  const base = { version: 1, provenance: 'runner', scope: 'process-execution-only',
    argv: argv.map(sanitize), cwd: sanitize(directory), startedAt };
  const finish = (outcome, code = null, terminationSignal = null, errorCode = null, outputComplete = false) => ({
    ...base, endedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - start),
    outcome, exitCode: code, signal: terminationSignal, errorCode, outputComplete,
    stdout: out.result(), stderr: err.result(),
  });
  if (signal?.aborted) return finish('cancelled');
  return new Promise(resolve => {
    let child, timer, fallback, outcome, errorCode = null, code = null, terminationSignal = null, done = false;
    const killGroup = () => {
      if (!child?.pid) return;
      try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') errorCode ??= error.code; }
    };
    const complete = (outputComplete = false) => {
      if (done) return; done = true;
      clearTimeout(timer); clearTimeout(fallback); signal?.removeEventListener('abort', cancel);
      resolve(finish(outcome ?? (code === 0 ? 'exited-zero' : 'exited-nonzero'), code, terminationSignal, errorCode, outputComplete));
    };
    const drainLimit = () => {
      fallback ??= setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); complete(); }, 250);
    };
    const stop = reason => { if (done || outcome) return; outcome = reason; killGroup(); drainLimit(); };
    const cancel = () => stop('cancelled');
    try {
      // Empty environment by default: no implicit credential or tool-hook inheritance.
      child = spawn(argv[0], argv.slice(1), { cwd: directory, env, shell: false,
        detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) { outcome = 'spawn-error'; errorCode = error.code ?? 'SPAWN_ERROR'; complete(); return; }
    child.stdout.on('data', chunk => out.add(chunk)); child.stderr.on('data', chunk => err.add(chunk));
    child.on('error', error => { outcome ??= 'spawn-error'; errorCode = error.code ?? 'SPAWN_ERROR'; drainLimit(); });
    child.on('exit', (exitCode, sig) => {
      code = exitCode; terminationSignal = sig;
      outcome ??= sig ? 'signalled' : exitCode === 0 ? 'exited-zero' : 'exited-nonzero';
      // Also stop descendants left in this group by a completed parent.
      killGroup(); drainLimit();
    });
    child.on('close', () => complete(true));
    timer = setTimeout(() => stop('timed-out'), timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}
