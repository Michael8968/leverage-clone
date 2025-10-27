import { NextResponse } from 'next/server';
import { getSuppliersRepository } from '@/lib/repositories/suppliers';

export async function GET() {
  try {
    const repo = getSuppliersRepository();
    const list = await repo.list();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
