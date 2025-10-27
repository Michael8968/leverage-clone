import { NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const db = getTcbDb();
    const res = await db.collection('users').where({ email }).limit(1).get();
    const user = res?.data?.[0];
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return NextResponse.json({ error: '密码错误' }, { status: 401 });

    const token = jwt.sign({ uid: user.uid, role: user.role, email: user.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '登录失败' }, { status: 500 });
  }
}
