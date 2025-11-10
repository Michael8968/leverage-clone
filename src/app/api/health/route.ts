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
      // TCB 轻量 ping - 在启动阶段跳过数据库检查
      if (process.env.STARTUP_GRACE_PERIOD === 'true') {
        dbStatus = 'ok';
        detail.note = 'startup-grace-period';
      } else {
        try {
          const db = getDb();
          await db.collection('health').limit(1).get();
          dbStatus = 'ok';
        } catch (e: any) {
          dbStatus = 'unavailable';
          detail.error = e?.message || String(e);
        }
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

    // 即使数据库不可用，基础健康检查也应该通过（服务器进程正在运行）
    // 只在完全失败时返回 503
    const isHealthy = dbStatus === 'ok' || dbStatus === 'skip' || dbStatus === 'mock';
    
    return NextResponse.json({
      ok: isHealthy,
      env,
      dbType: type,
      dbStatus,
      timestamp: new Date().toISOString(),
      ...detail && { detail }
    }, { status: isHealthy ? 200 : 503 });
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
 
