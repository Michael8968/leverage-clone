import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getTcbDb } from '@/lib/tcb';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const token = m[1];
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const db = getTcbDb();
    const snap = await db.collection('users').where({ uid: payload.uid }).limit(1).get();
    const user = snap?.data?.[0];
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    const { password_hash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '鉴权失败' }, { status: 401 });
  }
}
