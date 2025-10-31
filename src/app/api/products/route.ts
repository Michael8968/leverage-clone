import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as z from 'zod';

const dataFile = path.join(process.cwd(), 'data', 'products.json');

function readData() {
  try {
    if (!fs.existsSync(dataFile)) return [];
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8')) || [];
  } catch {
    return [];
  }
}

function writeData(list: any[]) {
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf-8');
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/products or /api/products/:id
    const id = parts.length >= 3 ? parts[2] : null;
    const list = readData();
    if (id) {
      const item = list.find((p: any) => p.id === id || p._id === id);
      if (!item) return NextResponse.json({ message: 'not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().gt(0),
      category: z.string().optional(),
      supplierId: z.string().optional(),
      creatorId: z.string().optional(),
      images: z.array(z.any()).optional(),
      details: z.array(z.any()).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.format() }, { status: 400 });
    const list = readData();
    const id = (Date.now() + Math.floor(Math.random() * 1000)).toString();
    const newItem = { ...body, id, createdAt: new Date().toISOString() };
    list.unshift(newItem);
    writeData(list);
    return NextResponse.json({ id, ...newItem });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts.length >= 3 ? parts[2] : null;
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      price: z.number().gt(0).optional(),
      category: z.string().optional(),
      supplierId: z.string().optional(),
      creatorId: z.string().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.format() }, { status: 400 });
    const list = readData();
    const idx = list.findIndex((p: any) => p.id === id || p._id === id);
    if (idx === -1) {
      const newItem = { ...body, id, createdAt: new Date().toISOString() };
      list.unshift(newItem);
      writeData(list);
      return NextResponse.json(newItem, { status: 201 });
    }
    list[idx] = { ...list[idx], ...body };
    writeData(list);
    return NextResponse.json(list[idx]);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts.length >= 3 ? parts[2] : null;
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    const list = readData();
    const newList = list.filter((p: any) => (p.id || p._id) !== id);
    writeData(newList);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
