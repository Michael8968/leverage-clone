/* Firebase Admin stub for build-time/source tracing. */
/* eslint-disable no-console */

function log(reason: string) {
  try {
    const stack = new Error('<<FADMIN_STUB>>').stack?.split('\n').slice(0, 10).join('\n');
    console.error('[FADMIN-STUB]', reason);
    console.error('[FADMIN-STUB-STACK]', stack);
  } catch {}
}

log('firebase-admin module was imported. Using stub.');

export const apps: any[] = [];
export function app() { return {}; }
export function initializeApp() { log('initializeApp called'); return {}; }
export const credential = { cert: (c: any) => { log('credential.cert called'); return c; } } as any;

export default { apps, app, initializeApp, credential } as any;
