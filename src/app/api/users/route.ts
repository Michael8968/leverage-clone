import { NextResponse } from 'next/server';
import { getUserRepository } from '@/lib/repositories/users';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const name = url.searchParams.get('name');
  const uid = url.searchParams.get('uid');
  const role = url.searchParams.get('role');

    const repo = getUserRepository();

    const q = url.searchParams.get('q');
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '50');

    // Prefer cursor-based if available
    const cursor = url.searchParams.get('cursor') || undefined;
    if (typeof (repo as any).listCursor === 'function') {
      const res = await (repo as any).listCursor({ q, limit, cursor, role });
      return NextResponse.json(res || { items: [], total: 0 });
    }

    // If repository supports paged listing, use it
    if (typeof (repo as any).listPaged === 'function') {
      const res = await (repo as any).listPaged({ q, page, limit, role });
      return NextResponse.json(res || { items: [], total: 0 });
    }

    // Prefer repository-optimized methods when available for exact matches
    if (uid && typeof repo.findByUid === 'function') {
      const u = await repo.findByUid(uid);
      return NextResponse.json(u ? { items: [u], total: 1 } : { items: [], total: 0 });
    }
    if (email && typeof repo.findByEmail === 'function') {
      const u = await repo.findByEmail(email);
      return NextResponse.json(u ? { items: [u], total: 1 } : { items: [], total: 0 });
    }
    if (role && typeof repo.findByRole === 'function' && !q && page === 1 && limit >= 1000) {
      // if caller requested all roles and repo supports it
      const listByRole = await repo.findByRole(role);
      return NextResponse.json({ items: listByRole || [], total: (listByRole || []).length });
    }

    // Fallback: list + server-side filter
    const list = await repo.list();
    let filtered = (list || []).filter((u: any) => {
      if (uid && String(u.uid) === String(uid)) return true;
      if (email && u.email && String(u.email).toLowerCase() === String(email).toLowerCase()) return true;
      if (name && u.name && String(u.name).toLowerCase() === String(name).toLowerCase()) return true;
      if (role && u.role && String(u.role).toLowerCase() === String(role).toLowerCase()) return true;
      return true;
    });

    if (q) {
      const low = String(q).toLowerCase();
      filtered = filtered.filter((u: any) => (u.name || '').toLowerCase().includes(low) || (u.email || '').toLowerCase().includes(low));
    }

    const total = filtered.length;
    const start = (Math.max(1, page) - 1) * Math.max(1, limit);
    const items = filtered.slice(start, start + Math.max(1, limit));
    return NextResponse.json({ items, total });
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
