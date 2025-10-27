import { NextResponse } from 'next/server';
import { getProductsRepository } from '@/lib/repositories/products';

export async function GET() {
  try {
    const repo = getProductsRepository();
    const list = await repo.list();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
