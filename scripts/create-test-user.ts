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

async function createTestUser(role: string = 'creator') {
  const now = Date.now();
  const email = `test.creator.${now}@example.com`;
  const password = 'Passw0rd!';
  const name = `TestCreator_${now}`;

  try {
    const reg = await callRoutePOST('@/app/api/auth/register/route', { email, password, name, role });
    if (reg.status === 200 && reg.data?.token) {
      console.log('Created test user:', { email, password, role, uid: reg.data.user.uid });
      return { email, password, role, uid: reg.data.user.uid };
    } else {
      console.error('Register failed:', reg.data);
      throw new Error('Register failed');
    }
  } catch (e) {
    console.error('Error creating test user:', e);
    throw e;
  }
}

async function main() {
  const user = await createTestUser();
  console.log('Test user created successfully.');
  console.log(JSON.stringify(user, null, 2));
}

main().catch((e) => {
  console.error('Failed to create test user:', e?.message || e);
  process.exit(1);
});