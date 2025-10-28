import { NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();
    if (!email || !password || !name) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const db = getTcbDb();
    
    // Check if email already exists
    const exists = await db.collection('users').where({ email }).limit(1).get();
    if (exists?.data?.length) return NextResponse.json({ error: '邮箱已注册' }, { status: 409 });

    // Check admin count limit (maximum 10 platform admins)
    if (role === 'admin') {
      const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
      const adminCount = adminQuery?.data?.length || 0;
      if (adminCount >= 10) {
        return NextResponse.json({ error: '平台管理员数量已达上限（最多10个）' }, { status: 403 });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const uid = `u_${Date.now()}`;
    const userDoc = {
      uid,
      email,
      name,
      role: role || 'user',
      avatar: '',
      level: 'New',
      points_balance: 0,
      signup_date: db.serverDate ? db.serverDate() : new Date(),
      last_level_check: db.serverDate ? db.serverDate() : new Date(),
      total_llm_calls: 0,
      status: 'active',
      password_hash: hash,
      createdAt: db.serverDate ? db.serverDate() : new Date(),
    };
    await db.collection('users').add(userDoc);

    const token = jwt.sign({ uid: userDoc.uid, role: userDoc.role, email: userDoc.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    const { password_hash, ...safeUser } = userDoc as any;
    return NextResponse.json({ token, user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '注册失败' }, { status: 500 });
  }
}
