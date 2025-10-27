import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const GEN_PATH = path.join(__dirname, '..', 'data', 'generated-test-accounts.json');
const OUT_PATH = path.join(__dirname, '..', 'data', 'local-seeded-users.json');

function readJson(p: string) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function main() {
  const gen = readJson(GEN_PATH);
  if (!gen || !Array.isArray(gen.credentials) || !gen.credentials.length) {
    console.error('No generated credentials found at', GEN_PATH);
    process.exit(2);
  }

  const existing = readJson(OUT_PATH) || [];
  const now = new Date().toISOString();

  for (const c of gen.credentials) {
    const exists = existing.find((u: any) => u.email === c.email);
    if (exists) continue;
    const hash = await bcrypt.hash(c.password, 10);
    const userDoc = {
      uid: c.uid || `u_local_${Date.now()}_${Math.floor(Math.random()*10000)}`,
      email: c.email,
      name: c.email.split('@')[0],
      role: c.role || 'user',
      avatar: '',
      level: 'New',
      points_balance: 0,
      signup_date: now,
      last_level_check: now,
      total_llm_calls: 0,
      status: 'active',
      password_hash: hash,
      createdAt: now,
    };
    existing.push(userDoc);
    console.log('Added local seed for', c.email);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2), 'utf-8');
  console.log('Wrote', OUT_PATH);
}

main().catch((e) => { console.error(e); process.exit(1); });
