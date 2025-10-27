// 纯前端/同构 Firestore 兼容层：通过 Next.js /api 路由访问数据，避免在客户端引入 Node-only 依赖。

function apiPathForCollection(name: string) {
  switch (name) {
    case 'products': return '/api/products';
    case 'suppliers': return '/api/suppliers';
    case 'ai_scenarios': return '/api/ai-scenarios';
    case 'appointments': return '/api/appointments';
    case 'demands': return '/api/demands';
    default: return `/api/${name}`;
  }
}

export function collection(dbOrName: any, name?: string) {
  const colName = typeof dbOrName === 'string' ? dbOrName : name;
  return { _col: String(colName) };
}

export function doc(collOrDb: any, id?: string) {
  if (typeof collOrDb === 'string' && id) return { _col: collOrDb, _id: id };
  if (collOrDb && collOrDb._col && id) return { _col: collOrDb._col, _id: id };
  return { _col: undefined, _id: undefined };
}

function toDocWrappers(list: any[]) {
  return list.map((d: any) => ({
    id: d._id || d.id,
    exists: !!d,
    data: () => d,
    get: (field: string) => (d ? d[field] : undefined)
  }));
}

export async function getDocs(collRef: any) {
  try {
    // 支持直接传 collection 引用或通过 query(...) 产生的查询包装
    let colName = collRef?._col as string | undefined;
    if (!colName && collRef?.__query) {
      const found = (collRef.__query as any[]).find((x: any) => x && x._col);
      colName = found?._col;
    }

    if (!colName) {
      console.warn('[cloudbase-compat] getDocs: invalid collection/query ref, return empty list');
      const emptyDocs: any[] = [];
      return { data: [], docs: emptyDocs, forEach(cb: any) { emptyDocs.forEach(cb); } } as any;
    }

    const url = apiPathForCollection(colName);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return { data: [], docs: [], forEach(cb: any) { /* no-op */ } } as any;
    }
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = [];
    }
    const list = Array.isArray(json) ? json : (json?.data || []);
    const docs = toDocWrappers(list);
    return { data: list, docs, forEach(cb: any) { docs.forEach(cb); } } as any;
  } catch (e) {
    console.warn('[cloudbase-compat] getDocs error:', e);
    return { data: [], docs: [], forEach(cb: any) { /* no-op */ } } as any;
  }
}

export async function getDoc(docRef: any) {
  const url = `${apiPathForCollection(docRef._col)}/${docRef._id}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { id: docRef._id, exists: false, data: () => null } as any;
  const data = await res.json();
  return { id: data._id || data.id || docRef._id, exists: !!data, data: () => data } as any;
}

export async function addDoc(collRef: any, data: any) {
  const url = apiPathForCollection(collRef._col);
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return await res.json();
}

export async function setDoc(docRef: any, data: any) {
  const url = `${apiPathForCollection(docRef._col)}/${docRef._id}`;
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return await res.json();
}

export async function updateDoc(docRef: any, data: any) {
  const url = `${apiPathForCollection(docRef._col)}/${docRef._id}`;
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return await res.json();
}

export async function deleteDoc(docRef: any) {
  const url = `${apiPathForCollection(docRef._col)}/${docRef._id}`;
  const res = await fetch(url, { method: 'DELETE' });
  return await res.json();
}

export function writeBatch(_db?: any) {
  const ops: Array<() => Promise<any>> = [];
  return {
    set(docRef: any, data: any) { ops.push(() => setDoc(docRef, data)); },
    update(docRef: any, data: any) { ops.push(() => updateDoc(docRef, data)); },
    delete(docRef: any) { ops.push(() => deleteDoc(docRef)); },
    async commit() { const results: any[] = []; for (const fn of ops) results.push(await fn()); return results; }
  };
}

export function serverTimestamp() { return Timestamp.now(); }
export const Timestamp = { now: () => new Date() } as any;
(Timestamp as any).fromDate = (d: Date) => d;
(Timestamp as any).fromMillis = (ms: number) => new Date(ms);
(Timestamp as any).toDate = function (t: any) { if (t instanceof Date) return t; if (typeof t === 'number') return new Date(t); return undefined; };
export function increment(n: number) { return { __op: 'inc', value: n }; }
export function arrayUnion(...items: any[]) { return { __op: 'arrayUnion', items }; }
export function arrayRemove(...items: any[]) { return { __op: 'arrayRemove', items }; }
export const db: any = null;
export function query(...args: any[]) { return { __query: args }; }
export function where(...args: any[]) { return { __where: args }; }
export function orderBy(...args: any[]) { return { __orderBy: args }; }
export function limit(n: number) { return { __limit: n }; }
export async function runTransaction(...args: any[]) { const fn: any = typeof args[0] === 'function' ? args[0] : args[1]; const tx = { async get(ref: any) { return getDoc(ref); }, async set(ref: any, data: any) { return setDoc(ref, data); }, async update(ref: any, data: any) { return updateDoc(ref, data); }, }; return await fn(tx); }
export function onSnapshot(ref: any, cb: any) { (async () => { try { if (ref && ref._col && ref._id) { const snap = await getDoc(ref); cb(snap); } else if (ref && ref._col) { const snap = await getDocs(ref); cb(snap); } else { cb(null); } } catch { cb(null); } })(); return () => {}; }
export const TcbTimestamp = Timestamp;
export { writeBatch as batchWrite };
