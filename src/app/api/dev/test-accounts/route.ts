import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// 仅在开发模式下启用此路由，生产环境应禁止
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const p = path.join(process.cwd(), 'data', 'generated-test-accounts.json');
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    // 返回按角色分组的凭据（选择首条作为快速登录目标）
    const creds = (parsed.credentials || []).reduce((acc: any, cur: any) => {
      (acc[cur.role] = acc[cur.role] || []).push(cur);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ ok: true, credentials: creds });
  } catch (e) {
    return NextResponse.json({ ok: false, error: '读取测试凭据失败', detail: String(e) }, { status: 500 });
  }
}
