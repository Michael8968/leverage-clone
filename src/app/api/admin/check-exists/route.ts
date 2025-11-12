import { NextRequest, NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getTcbDb();
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Check if any admin user exists
    const admins = await db
      .collection('users')
      .where({ role: 'admin' })
      .limit(1)
      .get();

    return NextResponse.json({
      adminExists: admins.data && admins.data.length > 0
    });
  } catch (error) {
    console.error('Error checking admin existence:', error);
    return NextResponse.json(
      { error: 'Failed to check admin existence', adminExists: true }, // Fail-safe: assume admin exists
      { status: 500 }
    );
  }
}
