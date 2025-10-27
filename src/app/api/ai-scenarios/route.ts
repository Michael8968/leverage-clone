import { NextResponse } from 'next/server';
import { getAiScenariosRepository } from '@/lib/repositories/ai-scenarios';

export async function GET() {
  try {
    const repo = getAiScenariosRepository();
    const list = await repo.list();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
