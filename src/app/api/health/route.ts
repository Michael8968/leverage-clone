import { NextResponse } from 'next/server';
import { getDb, getDbType, getDbInitializationError } from '@/lib/services/db';

export async function GET() {
  try {
    const type = getDbType();
    const skip = process.env.SKIP_ENV_VALIDATION === 'true';
    const env = process.env.NEXT_PUBLIC_ENV;

    let dbStatus: 'ok' | 'skip' | 'mock' | 'unavailable' = 'ok';
    let detail: any = {};

    if (skip) {
      dbStatus = 'skip';
    } else if (!type) {
      dbStatus = 'unavailable';
      detail.error = getDbInitializationError()?.message || 'not-initialized';
    } else if (type === 'mock') {
      dbStatus = 'mock';
    } else if (type === 'tcb') {
      // TCB 轻量 ping
      try {
        const db = getDb();
        await db.collection('health').limit(1).get();
        dbStatus = 'ok';
      } catch (e: any) {
        dbStatus = 'unavailable';
        detail.error = e?.message || String(e);
      }
    } else {
      // firestore 或其他
      try {
        const db = getDb();
        if (db?.collection) {
          await db.collection('health');
        }
        dbStatus = 'ok';
      } catch (e: any) {
        dbStatus = 'unavailable';
        detail.error = e?.message || String(e);
      }
    }

    return NextResponse.json({
      ok: dbStatus === 'ok',
      env,
      dbType: type,
      dbStatus,
      ...detail && { detail }
    }, { status: dbStatus === 'ok' ? 200 : 503 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
 
