import { NextResponse } from 'next/server';
import { getPointsRepository } from '@/lib/repositories/points';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount: number = Number(body?.amount || 0);
    const uid: string = body?.uid || 'anonymous';
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
    }

    const repo = getPointsRepository();
    await repo.addTransaction({ uid, type: 'recharge', amount, reason: 'recharge', status: 'pending' });
    return NextResponse.json({ success: true, uid, amount }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
