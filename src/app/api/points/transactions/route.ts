import { NextResponse } from 'next/server';
import { getPointsRepository } from '@/lib/repositories/points';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid') || undefined;
    const repo = getPointsRepository();
    const list = await repo.listTransactions(uid as any);
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const repo = getPointsRepository();
    await repo.addTransaction(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
