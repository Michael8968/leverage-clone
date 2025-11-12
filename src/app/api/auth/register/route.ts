import { NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();
    if (!email || !password || !name) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const db = getTcbDb();

    // Check if email already exists
    const exists = await db.collection('users').where({ email }).limit(1).get();
    if (exists?.data?.length) return NextResponse.json({ error: '邮箱已注册' }, { status: 409 });

    // Check admin role restrictions
    if (role === 'admin') {
      // Verify that the requester is an admin (if token provided)
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
          return NextResponse.json({ error: '只有管理员可以创建管理员账户' }, { status: 403 });
        }
      } else {
        // If no token provided, check if this is the first admin (bootstrap)
        const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
        const adminCount = adminQuery?.data?.length || 0;
        if (adminCount > 0) {
          return NextResponse.json({ error: '只有管理员可以创建管理员账户' }, { status: 403 });
        }
      }

      // Check admin count limit (maximum 10 platform admins)
      const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
      const adminCount = adminQuery?.data?.length || 0;
      if (adminCount >= 10) {
        return NextResponse.json({ error: '平台管理员数量已达上限（最多10个）' }, { status: 403 });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const uid = `u_${Date.now()}`;
    const now = new Date();
    const userDoc = {
      uid,
      email,
      name,
      role: role || 'user',
      avatar: '',
      level: 'New',
      pointsBalance: 0,
      signupDate: now,
      lastLevelCheckDate: now,
      totalLLMCalls: 0,
      status: 'active',
      passwordHash: hash,
      createdAt: now,
    };
    await db.collection('users').add(userDoc);

  const token = jwt.sign({ uid: userDoc.uid, role: userDoc.role, email: userDoc.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = userDoc as any;
  return NextResponse.json({ token, user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '注册失败' }, { status: 500 });
  }
}
