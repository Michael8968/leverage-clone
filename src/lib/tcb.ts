// Tencent CloudBase helper: lazy initialize and expose database
export type TcbApp = any;
export type TcbDb = any;

let _app: TcbApp | null = null;
let _db: TcbDb | null = null;

function requireTCB() {
  try {
    const req: NodeRequire = eval('require');
    return req('@cloudbase/node-sdk');
  } catch (err: any) {
    // Provide a clearer runtime message so deployers know to install the package
    const msg = "Cannot find module '@cloudbase/node-sdk'.\n" +
      "This project marks '@cloudbase/node-sdk' as external during build (see next.config.js),\n" +
      "so the module must be present in the production node_modules at runtime.\n" +
      "Fix by installing it on the target (e.g. `npm install --production @cloudbase/node-sdk`)\n" +
      "or include it in your deployment artifact. Original error: " + (err && err.message ? err.message : String(err));
    const e = new Error(msg);
    (e as any).original = err;
    throw e;
  }
}

export function getTcbApp(): TcbApp {
  if (_app) return _app;
  const env = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID;
  // Fallback to CLOUDBASE_* if TENCENTCLOUD_* is not set
  const secretId = process.env.TENCENTCLOUD_SECRET_ID || process.env.CLOUDBASE_SECRET_ID as any;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || process.env.CLOUDBASE_SECRET_KEY as any;
  const region = process.env.TENCENTCLOUD_REGION || process.env.CLOUDBASE_REGION || process.env.TCB_REGION || 'ap-shanghai';
  // If CloudBase / TCB credentials are missing, provide a lightweight local fallback
  if (!env || !secretId || !secretKey) {
    // create a minimal mock app that exposes database operations backed by local JSON files
    const fs: any = eval('require')('fs');
    const path: any = eval('require')('path');
    const dataDir = path.join(process.cwd(), 'data');

    const readJson = (file: string) => {
      try {
        const p = path.join(dataDir, file);
        if (!fs.existsSync(p)) return [];
        return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
      } catch (e) {
        return [];
      }
    };

    const writeJson = (file: string, data: any) => {
      try {
        const p = path.join(dataDir, file);
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        // ignore
      }
    };

    const mockDb: any = {
      serverDate: () => new Date(),
      collection: (name: string) => {
        // For users, prefer local-seeded-users.json to store generated users when running locally
        const file = name === 'users' ? 'local-seeded-users.json' : `${name}.json`;
        const readFileForQuery = (name === 'users') ? ['local-seeded-users.json', 'users.json'] : [file];
        return {
          where: (query: any) => ({
            limit: (_n: number) => ({
              get: async () => {
                // merge data from multiple files when needed (users)
                let all: any[] = [];
                for (const f of readFileForQuery) {
                  const d = readJson(f);
                  if (Array.isArray(d)) all = all.concat(d);
                }
                const keys = Object.keys(query || {});
                const data = all.filter((item: any) => keys.every(k => {
                  // simple equality match
                  return String(item[k]) === String(query[k]);
                }));
                return { data };
              }
            })
          }),
          add: async (doc: any) => {
            // always append new users to local-seeded-users.json to avoid overwriting example users.json
            const target = name === 'users' ? 'local-seeded-users.json' : file;
            const all = readJson(target);
            all.push(doc);
            writeJson(target, all);
            return { id: (all.length - 1).toString() };
          }
        };
      }
    };

    _app = { database: () => mockDb } as any;
    _db = _app.database();
    return _app;
  }
  const tcb = requireTCB();
  // Use top-level secretId/secretKey to be compatible with current @cloudbase/node-sdk
  _app = tcb.init({ env, secretId, secretKey, region });
  return _app;
}

export function getTcbDb(): TcbDb {
  if (_db) return _db;
  const app = getTcbApp();
  _db = app.database();
  return _db;
}
