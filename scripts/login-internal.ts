import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function callRoutePOST(modPath: string, body: any) {
  const mod = await import(modPath);
  const { POST } = mod as any;
  const req = new Request('http://localhost/api/_', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function main() {
  const genPath = path.join(__dirname, '..', 'data', 'generated-test-accounts.json');
  if (!fs.existsSync(genPath)) {
    console.error('generated-test-accounts.json not found');
    process.exit(2);
  }
  const gen = JSON.parse(fs.readFileSync(genPath, 'utf-8'));
  const cred = gen.credentials[0];
  console.log('Trying internal POST login for', cred.email);
  const login = await callRoutePOST('@/app/api/auth/login/route', { email: cred.email, password: cred.password });
  console.log('login ->', login.status, login.data);
  if (login.status === 200 && login.data?.token) {
    const token = login.data.token;
    const me = await callRouteGET('@/app/api/auth/me/route', 'http://localhost/api/auth/me', token);
    console.log('/api/auth/me ->', me.status, me.data);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
