
/**
 * @file src/app/api/products/route.ts
 * @description API endpoint for managing products (submissions).
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

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

        let products: any[] = [];
        if (dbType === 'firestore') {
            const { collection, query, where, getDocs, orderBy, Timestamp } = await import('firebase/firestore');
            const q = query(collection(db, COLLECTION_NAME), where('creatorId', '==', creatorId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            products = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                };
            });
        } else if (dbType === 'tcb') {
            const snapshot = await db.collection(COLLECTION_NAME).where({ creatorId }).orderBy('createdAt', 'desc').get();
            products = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }
        
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
        
        let newProduct;
        if (dbType === 'firestore') {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            newProduct = { ...body, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), newProduct);
            return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
        } else if (dbType === 'tcb') {
            newProduct = { ...body, createdAt: db.serverDate() };
            const result = await db.collection(COLLECTION_NAME).add(newProduct);
             return NextResponse.json({ id: result.id || result._id, ...body }, { status: 201 });
        }

    } catch (error: any) {
        console.error('[API /products POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create product', details: error.message }, { status: 500 });
    }
}
