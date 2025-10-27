import { NextResponse } from 'next/server';
import { getAppointmentsRepository } from '@/lib/repositories/appointments';

export async function GET() {
  try {
    const repo = getAppointmentsRepository();
    const list = await repo.list();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
