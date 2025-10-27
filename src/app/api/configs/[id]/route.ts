import { NextResponse } from 'next/server';
import { getConfigsRepository } from '@/lib/repositories/configs';

export async function GET(req: Request, ctx: any) {
  try {
    const repo = getConfigsRepository();
    const url = new URL(req.url);
    // params.id will be the collection name (we map route as /api/configs/:collection/:id?)
    // But route currently is /api/configs/[id], so we expect query ?collection=xxx
    const collection = url.searchParams.get('collection') || 'configs';
    const id = ctx?.params?.id;
    const data = await repo.getConfig(collection, id);
    return NextResponse.json({ id, data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: any) {
  try {
    const repo = getConfigsRepository();
    const url = new URL(req.url);
    const collection = url.searchParams.get('collection') || 'configs';
    const id = ctx?.params?.id;
    const body = await req.json();
    await repo.setConfig(collection, id, body);
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
