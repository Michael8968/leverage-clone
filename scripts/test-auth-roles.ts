import path from 'path';
import dotenv from 'dotenv';

// Load .env first, then fallback to .env.local to pick up TENCENTCLOUD_* if needed
dotenv.config();
if (!process.env.TENCENTCLOUD_SECRET_ID || !process.env.TENCENTCLOUD_SECRET_KEY) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

// Bridge CLOUDBASE_* to TENCENTCLOUD_* if not set
if (!process.env.TENCENTCLOUD_SECRET_ID && process.env.CLOUDBASE_SECRET_ID) {
  process.env.TENCENTCLOUD_SECRET_ID = process.env.CLOUDBASE_SECRET_ID;
}
if (!process.env.TENCENTCLOUD_SECRET_KEY && process.env.CLOUDBASE_SECRET_KEY) {
  process.env.TENCENTCLOUD_SECRET_KEY = process.env.CLOUDBASE_SECRET_KEY;
}
if (!process.env.TCB_ENV_ID && process.env.CLOUDBASE_ENV_ID) {
  process.env.TCB_ENV_ID = process.env.CLOUDBASE_ENV_ID;
}

type Role = 'admin' | 'creator' | 'supplier' | 'user';

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

async function callRouteGET(modPath: string, url: string, token?: string) {
  const mod = await import(modPath);
  const { GET } = mod as any;
  const req = new Request(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const res = await GET(req);
  const json = await (res as Response).json();
  return { status: (res as any).status || 200, data: json };
}

async function registerOrLogin(email: string, password: string, name: string, role: Role) {
  // Try register
  const reg = await callRoutePOST('@/app/api/auth/register/route', { email, password, name, role });
  if (reg.status === 200 && reg.data?.token) return reg.data;
  if (reg.status === 409) {
    // already exists, try login
    const login = await callRoutePOST('@/app/api/auth/login/route', { email, password, role });
    if (login.status === 200 && login.data?.token) return login.data;
    throw new Error('Login failed for ' + email + ': ' + JSON.stringify(login.data));
  }
  throw new Error('Register failed for ' + email + ': ' + JSON.stringify(reg.data));
}

async function authMe(token: string) {
  const me = await callRouteGET('@/app/api/auth/me/route', 'http://localhost/api/auth/me', token);
  if (me.status !== 200) throw new Error('auth/me failed: ' + JSON.stringify(me.data));
  return me.data?.user;
}

async function tryFeatures(uid: string, token: string) {
  const results: any = {};
  // 1) executePrompt direct call (no token needed)
  try {
    const mod = await import('@/ai/flows/prompt-execution-flow');
    const { executePrompt } = mod as any;
    const r = await executePrompt({ prompt: '为新用户推荐一个快速体验流程', userId: uid });
    results.executePrompt = { ok: true, output: r?.output, cost: r?.cost };
  } catch (e: any) {
    results.executePrompt = { ok: false, error: e?.message || String(e) };
  }

  // 2) createDemand via API
  try {
    const r = await callRoutePOST('@/app/api/createDemand/route', { title: '测试需求 - ' + uid, requesterId: uid }, token);
    results.createDemand = { ok: r.status === 201, data: r.data };
  } catch (e: any) {
    results.createDemand = { ok: false, error: e?.message || String(e) };
  }

  // 3) list products
  try {
    const mod = await import('@/app/api/products/route');
    const { GET } = mod as any;
    const res = await GET(new Request('http://localhost/api/products'));
    const data = await (res as Response).json();
    results.products = { ok: true, count: Array.isArray(data) ? data.length : (data?.items?.length || 0) };
  } catch (e: any) {
    results.products = { ok: false, error: e?.message || String(e) };
  }

  // 4) list suppliers
  try {
    const mod = await import('@/app/api/suppliers/route');
    const { GET } = mod as any;
    const res = await GET(new Request('http://localhost/api/suppliers'));
    const data = await (res as Response).json();
    results.suppliers = { ok: true, count: Array.isArray(data) ? data.length : (data?.items?.length || 0) };
  } catch (e: any) {
    results.suppliers = { ok: false, error: e?.message || String(e) };
  }

  // 5) list users by role
  try {
    const r = await callRouteGET('@/app/api/users/route', `http://localhost/api/users?role=user&limit=1000`);
    results.users = { ok: true, total: r?.data?.total ?? (Array.isArray(r?.data) ? r.data.length : 0) };
  } catch (e: any) {
    results.users = { ok: false, error: e?.message || String(e) };
  }

  return results;
}

async function main() {
  const now = Date.now();
  const roles: Role[] = ['admin', 'creator', 'supplier', 'user'];
  const password = 'Passw0rd!';

  const summaries: any[] = [];

  for (const role of roles) {
    const email = `${role}.e2e.${now}@example.com`;
    const name = `${role.toUpperCase()}_E2E_${now}`;
    try {
      const { token, user } = await registerOrLogin(email, password, name, role);
      const me = await authMe(token);
      const features = await tryFeatures(me.uid, token);
      summaries.push({ role, email, uid: me.uid, ok: true, features });
    } catch (e: any) {
      summaries.push({ role, email, ok: false, error: e?.message || String(e) });
    }
  }

  // Print compact summary
  for (const s of summaries) {
    if (s.ok) {
      console.log(`[${s.role}] OK uid=${s.uid} email=${s.email}`);
      console.log(`  - executePrompt: ${s.features.executePrompt.ok ? 'PASS' : 'FAIL'}`);
      console.log(`  - createDemand: ${s.features.createDemand.ok ? 'PASS' : 'FAIL'}`);
      console.log(`  - products list: ${s.features.products.ok ? 'PASS' : 'FAIL'} (count=${s.features.products.count})`);
      console.log(`  - suppliers list: ${s.features.suppliers.ok ? 'PASS' : 'FAIL'} (count=${s.features.suppliers.count})`);
      console.log(`  - users list(user role): ${s.features.users.ok ? 'PASS' : 'FAIL'} (total=${s.features.users.total})`);
    } else {
      console.error(`[${s.role}] FAIL email=${s.email} -> ${s.error}`);
    }
  }
}

main().catch((e) => {
  console.error('Run failed:', e?.message || e);
  process.exit(1);
});
