// Next.js App Router instrumentation entry. Runs on server during build and runtime.
export async function register() {
  const PATTERN = 'project_id';
  try {
    const origErr = console.error;
    console.error = function (...args: any[]) {
      if (args.some(a => typeof a === 'string' && a.includes(PATTERN))) {
        try {
          throw new Error('<<NEXT_INSTRUMENTATION_STACK>>');
        } catch (e: any) {
          origErr('[NEXT-INSTRUMENTATION]', ...args);
          origErr('[NEXT-INSTRUMENTATION-STACK]', e.stack?.split('\n').slice(0, 12).join('\n'));
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
          const stack = new Error('<<NEXT_INSTRUMENTATION_WRITE_STACK>>').stack?.split('\n').slice(0, 8).join('\n');
          origErr('[NEXT-INSTRUMENTATION-STERR]', text.trim());
          origErr('[NEXT-INSTRUMENTATION-STERR-STACK]', stack);
        }
      } catch {}
      return origWrite.call(process.stderr, chunk, ...rest);
    };
  } catch {}
}
