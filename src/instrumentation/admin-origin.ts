/**
 * Instrumentation: capture mysterious Firebase Admin project_id error source.
 * Wrap console.error and process.stderr.write to tag stack traces when pattern matches.
 */

const PATTERN = 'project_id';
let alreadyWrapped = false;

function wrapConsole() {
  if (alreadyWrapped) return;
  alreadyWrapped = true;
  const origErr = console.error;
  console.error = function (...args: any[]) {
    if (args.some(a => typeof a === 'string' && a.includes(PATTERN))) {
      try {
        throw new Error('<<ADMIN_ORIGIN_STACK>>');
      } catch (e: any) {
        origErr('[ADMIN-ORIGIN]', ...args);
        origErr('[ADMIN-ORIGIN-STACK]', e.stack?.split('\n').slice(0, 12).join('\n'));
        return;
      }
    }
    return origErr.apply(this, args as any);
  };
  const origWrite = process.stderr.write as any;
  process.stderr.write = function (chunk: any, ...rest: any[]) {
    try {
      const text = typeof chunk === 'string' ? chunk : chunk?.toString?.();
      if (text && text.includes(PATTERN)) {
        const stack = new Error('<<ADMIN_ORIGIN_WRITE_STACK>>').stack?.split('\n').slice(0, 8).join('\n');
        origErr('[ADMIN-ORIGIN-STERR]', text.trim());
        origErr('[ADMIN-ORIGIN-STERR-STACK]', stack);
      }
    } catch {}
    return origWrite.call(process.stderr, chunk, ...rest);
  };
}

wrapConsole();

export {}; // side-effect only
