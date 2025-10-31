import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as z from 'zod';

const dataFile = path.join(process.cwd(), 'data', 'demands.json');

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
    const id = parts.length >= 3 ? parts[2] : null;
    const searchParams = url.searchParams;
    const type = searchParams.get('type');
    const list = readData();
    if (id) {
      const item = list.find((d: any) => d.id === id || d._id === id);
      if (!item) return NextResponse.json({ message: 'not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    if (type) return NextResponse.json(list.filter((d: any) => d.type === type));
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      title: z.string().min(5),
      description: z.string().min(20),
      budget: z.number().positive(),
      category: z.string().min(1),
      requesterId: z.string().min(1),
      requesterName: z.string().optional(),
      requesterAvatar: z.string().optional(),
      status: z.string().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.format() }, { status: 400 });
    const list = readData();
    const id = (Date.now() + Math.floor(Math.random() * 1000)).toString();
    const newItem = { ...body, id, createdAt: new Date().toISOString() };
    list.unshift(newItem);
    writeData(list);
    return NextResponse.json(newItem);
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
    const list = readData();
    const idx = list.findIndex((d: any) => d.id === id || d._id === id);
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
    const newList = list.filter((d: any) => (d.id || d._id) !== id);
    writeData(newList);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
