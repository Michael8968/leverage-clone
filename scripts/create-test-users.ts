import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const OUT_CREDENTIALS = path.join(__dirname, '..', 'data', 'generated-test-accounts.json');
const OUT_LOCAL_USERS = path.join(__dirname, '..', 'data', 'local-seeded-users.json');

type Role = 'admin' | 'creator' | 'supplier' | 'user';

function genPassword(i: number) {
  return `Passw0rd!${i}`;
}

async function callRoutePOST(modPath: string, body: any, token?: string) {
  const mod = await import(modPath);
  const { POST } = mod as any;
  const req = new Request('http://localhost/api/_', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const json = await (res as Response).json();
  return { status: (res as any).status || 200, data: json };
}

async function registerOrLogin(email: string, password: string, name: string, role: Role) {
  try {
    const reg = await callRoutePOST('@/app/api/auth/register/route', { email, password, name, role });
    if (reg.status === 200 && reg.data?.token) return reg.data;
    if (reg.status === 409) {
      const login = await callRoutePOST('@/app/api/auth/login/route', { email, password, role });
      if (login.status === 200 && login.data?.token) return login.data;
      throw new Error('Login failed for ' + email + ': ' + JSON.stringify(login.data));
    }
    throw new Error('Register failed for ' + email + ': ' + JSON.stringify(reg.data));
  } catch (e: any) {
    throw e;
  }
}

function writeJson(p: string, obj: any) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
}

async function main() {
  const now = Date.now();
  const roles: Role[] = ['admin', 'creator', 'supplier', 'user'];
  const countPerRole = Number(process.argv[2] || 3);

  const credentials: any[] = [];
  const localUsers: any[] = [];

  let fallbackToLocal = false;

  let idx = 1;
  for (const role of roles) {
    for (let i = 0; i < countPerRole; i++) {
      const email = `${role}.e2e.${now}.${i}@example.com`;
      const name = `${role.toUpperCase()}_E2E_${now}_${i}`;
      const password = genPassword(idx++);

      if (!fallbackToLocal) {
        try {
          const data = await registerOrLogin(email, password, name, role);
          credentials.push({ email, password, uid: data.user?.uid ?? data.user?.id ?? null, role, ok: true });
          console.log(`[${role}] registered: ${email}`);
          continue;
        } catch (e: any) {
          console.error(`Remote register failed: ${e?.message || e}`);
          // If error mentions TCB credentials or network, fall back to local
          if (/TCB credentials missing|credentials missing|env|secret/i.test(String(e?.message || ''))) {
            fallbackToLocal = true;
          } else {
            // Still push failure and continue
            credentials.push({ email, password, role, ok: false, error: String(e?.message || e) });
            continue;
          }
        }
      }

      // Local fallback: generate password hash and create user doc
      const hash = await bcrypt.hash(password, 10);
      const userDoc = {
        uid: `u_local_${now}_${Math.floor(Math.random() * 100000)}`,
        email,
        name,
        role,
        avatar: '',
        level: 'New',
        points_balance: 0,
        signup_date: new Date().toISOString(),
        last_level_check: new Date().toISOString(),
        total_llm_calls: 0,
        status: 'active',
        password_hash: hash,
        createdAt: new Date().toISOString(),
      };
      localUsers.push(userDoc);
      credentials.push({ email, password, uid: userDoc.uid, role, ok: true, local: true });
      console.log(`[${role}] created locally: ${email}`);
    }
  }

  // Write outputs
  writeJson(OUT_CREDENTIALS, { generatedAt: new Date().toISOString(), credentials });
  if (localUsers.length) writeJson(OUT_LOCAL_USERS, localUsers);

  console.log('Wrote credentials to', OUT_CREDENTIALS);
  if (localUsers.length) console.log('Wrote local user docs to', OUT_LOCAL_USERS);
  console.log('Summary:');
  const okCount = credentials.filter((c) => c.ok).length;
  console.log(`  total requested: ${roles.length * countPerRole}`);
  console.log(`  succeeded: ${okCount}`);
  console.log(`  failed: ${credentials.length - okCount}`);
}

main().catch((e) => {
  console.error('Script failed:', e?.message || e);
  process.exit(1);
});
