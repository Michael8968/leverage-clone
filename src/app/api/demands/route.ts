import { NextResponse } from 'next/server';
import { getDemandsRepository } from '@/lib/repositories/demands';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'public';
  try {
    const repo = getDemandsRepository();
    const list = await repo.list(type || undefined);
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
