import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

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

async function main() {
  const genPath = path.join(__dirname, '..', 'data', 'generated-test-accounts.json');
  if (!fs.existsSync(genPath)) {
    console.error('generated-test-accounts.json not found. Run create-test-users first.');
    process.exit(2);
  }
  const gen = JSON.parse(fs.readFileSync(genPath, 'utf-8'));
  // prefer an admin account
  const admin = gen.credentials.find((c: any) => c.role === 'admin') || gen.credentials[0];
  if (!admin) {
    console.error('No credentials found in generated file');
    process.exit(3);
  }

  console.log('Logging in as', admin.email);
  const login = await callRoutePOST('@/app/api/auth/login/route', { email: admin.email, password: admin.password });
  if (login.status !== 200 || !login.data?.token) {
    console.error('Login failed:', login.status, login.data);
    process.exit(4);
  }
  const token = encodeURIComponent(login.data.token);
  const url = `http://localhost:3000/set-token.html?token=${token}&redirect=/dashboard`;
  console.log('Opening browser to', url);

  // Windows: use start, macOS: open, linux: xdg-open
  const platform = process.platform;
  const cmd = platform === 'win32' ? `start "" "${url}"` : platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('Failed to open browser:', err);
    else console.log('Browser opened.');
    process.exit(err ? 1 : 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
