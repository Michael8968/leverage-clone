import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getTcbDb } from '@/lib/tcb';
import fs from 'fs';
import path from 'path';

const DATAFILE = path.resolve(process.cwd(), 'data', 'resources.json');

async function readJsonFallback() {
  try {
    const raw = await fs.promises.readFile(DATAFILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

async function writeJsonFallback(data: any[]) {
  await fs.promises.mkdir(path.dirname(DATAFILE), { recursive: true });
  await fs.promises.writeFile(DATAFILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  try {
    const db = getTcbDb();
    if (db) {
      if (id) {
        const res = await db.collection('resources').doc(id).get();
        const doc = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (!doc) return NextResponse.json(null, { status: 404 });
        return NextResponse.json({ ...doc, id: doc._id || doc.id });
      }
      const listRes = await db.collection('resources').get();
      const raw = listRes?.data || [];
      const data = raw.map((d: any) => ({ ...d, id: d._id || d.id }));
      return NextResponse.json({ data });
    }
  } catch (e) {
    // fallback
  }

  const all = await readJsonFallback();
  if (id) {
    const found = all.find((r: any) => String(r.id) === String(id));
    if (!found) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(found);
  }
  return NextResponse.json({ data: all });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const db = getTcbDb();
    if (db) {
      const now = new Date();
      const toInsert = { ...body, createdAt: now };
      const res = await db.collection('resources').add(toInsert);
      // CloudBase add may return id in different shapes; normalize
      const anyRes: any = res as any;
      const newId = anyRes?.id ?? anyRes?._id ?? null;
      return NextResponse.json({ id: newId, ...toInsert });
    }
  } catch (e) {}

  const all = await readJsonFallback();
  const id = `r_${Date.now()}`;
  const item = { id, ...body, createdAt: new Date().toISOString() };
  all.push(item);
  await writeJsonFallback(all);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  const body = await req.json();
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  try {
    const db = getTcbDb();
    if (db) {
      await db.collection('resources').doc(id).update(body);
      return NextResponse.json({ id, ...body });
    }
  } catch (e) {}

  const all = await readJsonFallback();
  const idx = all.findIndex((r: any) => String(r.id) === String(id));
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  all[idx] = { ...all[idx], ...body };
  await writeJsonFallback(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  try {
    const db = getTcbDb();
    if (db) {
      await db.collection('resources').doc(id).remove();
      return NextResponse.json({ ok: true });
    }
  } catch (e) {}

  const all = await readJsonFallback();
  const next = all.filter((r: any) => String(r.id) !== String(id));
  await writeJsonFallback(next);
  return NextResponse.json({ ok: true });
}
