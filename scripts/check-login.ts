import fs from 'fs';
import path from 'path';

const CRED_PATH = path.join(__dirname, '..', 'data', 'generated-test-accounts.json');

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  if (!fs.existsSync(CRED_PATH)) {
    console.error('Credentials file not found:', CRED_PATH);
    process.exit(2);
  }
  const raw = fs.readFileSync(CRED_PATH, 'utf-8');
  const json = JSON.parse(raw);
  const creds = json.credentials || [];
  if (!creds.length) {
    console.error('No credentials found in', CRED_PATH);
    process.exit(3);
  }

  const cred = creds[0];
  const payload = { email: cred.email, password: cred.password };

  const maxWait = 30000; // 30s
  const start = Date.now();
  let lastErr: any = null;

  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        console.log('LOGIN OK');
        console.log('email:', cred.email);
        console.log('token:', data.token ? data.token.slice(0, 40) + '...' : '(no token)');
        console.log('user:', JSON.stringify(data.user, null, 2));
        process.exit(0);
      } else {
        console.error('Login failed:', res.status, data);
        process.exit(4);
      }
    } catch (e: any) {
      lastErr = e;
      // likely server not up yet
      await sleep(1000);
    }
  }

  console.error('Timed out waiting for server to be ready. Last error:', lastErr);
  process.exit(5);
}

main().catch((e) => {
  console.error('Script error:', e?.message || e);
  process.exit(1);
});
