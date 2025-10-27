// Tencent CloudBase helper: lazy initialize and expose database
export type TcbApp = any;
export type TcbDb = any;

let _app: TcbApp | null = null;
let _db: TcbDb | null = null;

function requireTCB() {
  // eslint-disable-next-line no-eval
  const req: NodeRequire = eval('require');
  return req('@cloudbase/node-sdk');
}

export function getTcbApp(): TcbApp {
  if (_app) return _app;
  const env = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const region = process.env.TENCENTCLOUD_REGION || 'ap-guangzhou';
  if (!env || !secretId || !secretKey) {
    throw new Error('TCB credentials missing. Please set TCB_ENV_ID/CLOUDBASE_ENV_ID, TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY');
  }
  const tcb = requireTCB();
  _app = tcb.init({ env, credentials: { secretId, secretKey }, region });
  return _app;
}

export function getTcbDb(): TcbDb {
  if (_db) return _db;
  const app = getTcbApp();
  _db = app.database();
  return _db;
}
