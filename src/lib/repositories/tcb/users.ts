import type { UserRepository } from '@/lib/repositories/users';
import { sanitizeUser } from '@/lib/repositories/users';
import { getTcbDb } from '@/lib/tcb';

export function createTcbUserRepository(): UserRepository {
  return {
    async list() {
      const db = getTcbDb();
      const res = await db.collection('users').get();
      const list = (res?.data || []).map(sanitizeUser);
      return list;
    },
    async findByEmail(email: string) {
      const db = getTcbDb();
      const res = await db.collection('users').where({ email }).limit(1).get();
      const item = (res?.data || [])[0];
      return item ? sanitizeUser(item) : null;
    },
    async findByName(name: string) {
      const db = getTcbDb();
      // exact name match; apps can use client-side fuzzy matching if needed
      const res = await db.collection('users').where({ name }).get();
      return (res?.data || []).map(sanitizeUser);
    },
    async findByUid(uid: string) {
      const db = getTcbDb();
      const res = await db.collection('users').where({ uid }).limit(1).get();
      const item = (res?.data || [])[0];
      return item ? sanitizeUser(item) : null;
    },
    async findByRole(role: string) {
      const db = getTcbDb();
      const res = await db.collection('users').where({ role }).get();
      return (res?.data || []).map(sanitizeUser);
    },
    async listPaged(opts: any) {
      const db = getTcbDb();
      const page = Math.max(1, Number(opts?.page || 1));
      const limit = Math.max(1, Math.min(100, Number(opts?.limit || 50)));
      const q = opts?.q;
      const role = opts?.role;

      let coll = db.collection('users');
      // CloudBase SDK supports simple where queries; for fuzzy we fallback to server-side filtering
      if (role) coll = coll.where({ role });

      const skip = (page - 1) * limit;
      // If a fuzzy query is requested, try to do it on the DB side using RegExp if available
      if (q && q.trim()) {
        try {
          const pattern = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = db.RegExp ? db.RegExp({ regexp: pattern, options: 'i' }) : null;
          if (re) {
            // query name and email separately and merge unique results
            const nameQuery = role ? db.collection('users').where({ role }).where({ name: re }) : db.collection('users').where({ name: re });
            const emailQuery = role ? db.collection('users').where({ role }).where({ email: re }) : db.collection('users').where({ email: re });

            const [nameRes, emailRes] = await Promise.all([
              nameQuery.skip(skip).limit(limit).get().catch(() => ({ data: [] })),
              emailQuery.skip(skip).limit(limit).get().catch(() => ({ data: [] })),
            ]);

            const combined = [...(nameRes?.data || []), ...(emailRes?.data || [])];
            // unique by uid/_id/id
            const seen = new Set();
            const items = combined.map(sanitizeUser).filter((u: any) => {
              if (!u || !u.uid) return false;
              if (seen.has(u.uid)) return false;
              seen.add(u.uid);
              return true;
            });

            // attempt to get total count for both queries
            let total = items.length;
            try {
              const [nameCount, emailCount] = await Promise.all([
                nameQuery.count().catch(() => ({ total: 0 })),
                emailQuery.count().catch(() => ({ total: 0 })),
              ]);
              // estimate unique total as sum minus overlap (approximate)
              total = Math.max(0, (nameCount.total || 0) + (emailCount.total || 0) - Math.floor((items.length) / 2));
            } catch {
              // ignore
            }

            return { items, total };
          }
        } catch (err) {
          // fall through to fallback
        }
      }

      // fetch a block (limit + skip) then slice to page if skip is supported
      const res = await coll.skip(skip).limit(limit).get();
      const items = (res?.data || []).map(sanitizeUser);

      // If fuzzy q provided and db can't do fuzzy, do client-side filter
      let filtered = items;
      if (q && q.trim()) {
        const low = String(q).toLowerCase();
        filtered = items.filter((u: any) => (u.name || '').toLowerCase().includes(low) || (u.email || '').toLowerCase().includes(low));
      }

      // total: attempt a fast count query if supported; else estimate by fetching without skip/limit
      let total = res?.pagers?.total || filtered.length;
      try {
        const countRes = await db.collection('users').count();
        total = countRes.total || total;
      } catch {
        // ignore
      }

      return { items: filtered, total };
    }
    ,
    async listCursor(opts: any) {
      const db = getTcbDb();
      const q = opts?.q;
      const role = opts?.role;
      const limit = Math.max(1, Math.min(100, Number(opts?.limit || 20)));
      const cursor = opts?.cursor;

      let coll = db.collection('users');
      if (role) coll = coll.where({ role });

      // If no cursor, start from beginning. We'll attempt to use uid/_id ordering.
      let queryColl = coll.orderBy ? coll.orderBy('_id') : coll;
      if (cursor) {
        try {
          const decoded = Buffer.from(String(cursor), 'base64').toString('utf-8');
          // assume decoded is lastId
          if (queryColl.startAfter) queryColl = queryColl.startAfter(decoded);
        } catch (e) {
          // ignore invalid cursor
        }
      }

      // apply limit
      const res = await (queryColl.limit ? queryColl.limit(limit).get() : queryColl.skip(0).limit(limit).get());
      const items = (res?.data || []).map(sanitizeUser);
      const last = items.length > 0 ? items[items.length - 1] : null;
      const nextCursor = last ? Buffer.from(String(last.uid || last._id || last.id)).toString('base64') : undefined;
      return { items, nextCursor, total: res?.pagers?.total };
    }
  };
}
