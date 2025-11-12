
/**
 * @file src/app/api/products/route.ts
 * @description API endpoint for managing products (submissions).
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/services/db';

const COLLECTION_NAME = 'products';

/**
 * GET /api/products
 * Fetches products, optionally filtering by creatorId.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const creatorId = searchParams.get('creatorId');

        if (!creatorId) {
            return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
        }

        const db = getDb();
        const snapshot = await db.collection(COLLECTION_NAME)
            .where({ creatorId })
            .orderBy('createdAt', 'desc')
            .get();
        const products = (snapshot?.data || []).map((item: any) => ({ ...item, id: item._id || item.id }));
        
        return NextResponse.json(products);
    } catch (error: any) {
        console.error('[API /products GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch products', details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/products
 * Creates a new product.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const db = getDb();
        const newProduct = { ...body, createdAt: new Date().toISOString() };
        const result = await db.collection(COLLECTION_NAME).add(newProduct);
        return NextResponse.json({ id: result?.id || result?._id, ...body }, { status: 201 });

    } catch (error: any) {
        console.error('[API /products POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create product', details: error.message }, { status: 500 });
    }
}
