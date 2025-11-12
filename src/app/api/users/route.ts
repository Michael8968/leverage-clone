import { NextResponse } from 'next/server';
import { getUserRepository } from '@/lib/repositories/users';
import { verifyToken } from '@/lib/auth/jwt';
import type { User } from '@/lib/types';

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

export async function PUT(request: Request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const targetUid = url.searchParams.get('uid');
    if (!targetUid) {
      return NextResponse.json({ error: 'User UID required' }, { status: 400 });
    }

    const updates = await request.json();
    const repo = getUserRepository();

    if (!repo.update) {
      return NextResponse.json({ error: 'Update not supported' }, { status: 501 });
    }

    // Prevent non-admins from updating admin users (unless they are admin themselves)
    if (updates.role === 'admin' && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Cannot promote to admin' }, { status: 403 });
    }

    // Prevent updating uid
    delete updates.uid;

    const updatedUser = await repo.update(targetUid, updates);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (e: any) {
    console.error('PUT /api/users error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const targetUid = url.searchParams.get('uid');
    if (!targetUid) {
      return NextResponse.json({ error: 'User UID required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (targetUid === decoded.uid) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const repo = getUserRepository();

    if (!repo.delete) {
      return NextResponse.json({ error: 'Delete not supported' }, { status: 501 });
    }

    const success = await repo.delete(targetUid);
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/users error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
