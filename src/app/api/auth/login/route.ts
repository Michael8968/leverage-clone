import { NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

async function findLocalUserByEmail(email: string) {
  try {
    const p = path.join(process.cwd(), 'data', 'local-seeded-users.json');
    if (!fs.existsSync(p)) return null;
    const arr = JSON.parse(fs.readFileSync(p, 'utf-8')) as any[];
    return arr.find(u => String(u.email).toLowerCase() === String(email).toLowerCase()) || null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const db = getTcbDb();
    // try primary DB
    let res;
    try {
      res = await db.collection('users').where({ email }).limit(1).get();
    } catch (e) {
      // db query failed (cloud issues) - fall through to local lookup
      res = null;
      console.error('[auth/login] db.collection.users.where.get failed:', (e as any)?.message || e);
    }

    let user = res?.data?.[0];

    // if no user found in primary DB, try local seeded users as fallback
    if (!user) {
      console.debug('[auth/login] user not found in primary DB, trying local seed');
      user = await findLocalUserByEmail(email);
      if (user) {
        console.debug('[auth/login] found user in local-seeded-users.json', user.email);
      }
    }

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return NextResponse.json({ error: '密码错误' }, { status: 401 });

    const token = jwt.sign({ uid: user.uid, role: user.role, email: user.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  } catch (e: any) {
    console.error('[auth/login] unexpected error', e);
    return NextResponse.json({ error: e.message || '登录失败' }, { status: 500 });
  }
}
