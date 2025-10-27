import { NextResponse } from 'next/server';
import { getPointsRepository } from '@/lib/repositories/points';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const repo = getPointsRepository();
    const balance = await repo.getBalance(userId);
    return NextResponse.json({ userId, balance });
  } catch {
    return NextResponse.json({ userId: 'anonymous', balance: 0 });
  }
}
