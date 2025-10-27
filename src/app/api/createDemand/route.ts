import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title: string = body?.title || '未命名需求';
    const requesterId: string = body?.requesterId || 'anonymous';
    const created = { id: Date.now().toString(), title, requesterId };
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
