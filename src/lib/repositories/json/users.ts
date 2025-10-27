import type { UserRepository } from '@/lib/repositories/users';
import { sanitizeUser } from '@/lib/repositories/users';
import path from 'path';
import { promises as fs } from 'fs';

export function createJsonUserRepository(): UserRepository {
  return {
    async list() {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list.map(sanitizeUser) : [];
      } catch {
        return [];
      }
    },
    async findByEmail(email: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        const found = (Array.isArray(list) ? list : []).find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
        return found ? sanitizeUser(found) : null;
      } catch {
        return null;
      }
    },
    async findByName(name: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        return (Array.isArray(list) ? list.filter((u: any) => String(u.name).toLowerCase() === String(name).toLowerCase()) : []).map(sanitizeUser);
      } catch {
        return [];
      }
    },
    async findByUid(uid: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        const found = (Array.isArray(list) ? list : []).find((u: any) => String(u.uid || u.id || u._id) === String(uid));
        return found ? sanitizeUser(found) : null;
      } catch {
        return null;
      }
    },
    async findByRole(role: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        return (Array.isArray(list) ? list.filter((u: any) => String(u.role).toLowerCase() === String(role).toLowerCase()) : []).map(sanitizeUser);
      } catch {
        return [];
      }
    },
    async listPaged(opts: any) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        let items = list.map(sanitizeUser);
        if (opts?.role) items = items.filter((u: any) => String(u.role).toLowerCase() === String(opts.role).toLowerCase());
        if (opts?.q) {
          const low = String(opts.q).toLowerCase();
          items = items.filter((u: any) => (u.name || '').toLowerCase().includes(low) || (u.email || '').toLowerCase().includes(low));
        }
        const total = items.length;
        const page = Math.max(1, Number(opts?.page || 1));
        const limit = Math.max(1, Math.min(100, Number(opts?.limit || 50)));
        const start = (page - 1) * limit;
        const slice = items.slice(start, start + limit);
        return { items: slice, total };
      } catch {
        return { items: [], total: 0 };
      }
    }
    ,
    async listCursor(opts: any) {
      try {
        const file = path.join(process.cwd(), 'data', 'users.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        let items = list.map(sanitizeUser);
        if (opts?.role) items = items.filter((u: any) => String(u.role).toLowerCase() === String(opts.role).toLowerCase());
        if (opts?.q) {
          const low = String(opts.q).toLowerCase();
          items = items.filter((u: any) => (u.name || '').toLowerCase().includes(low) || (u.email || '').toLowerCase().includes(low));
        }
        const limit = Math.max(1, Math.min(100, Number(opts?.limit || 20)));
        let start = 0;
        if (opts?.cursor) {
          try { start = parseInt(Buffer.from(String(opts.cursor), 'base64').toString('utf-8'), 10) + 1; } catch { start = 0; }
        }
        const slice = items.slice(start, start + limit);
        const nextIdx = start + slice.length - 1;
        const nextCursor = slice.length > 0 && nextIdx + 1 < items.length ? Buffer.from(String(nextIdx)).toString('base64') : undefined;
        return { items: slice, nextCursor, total: items.length };
      } catch {
        return { items: [], total: 0 };
      }
    }
  };
}
