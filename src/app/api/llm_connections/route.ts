
/**
 * @file src/app/api/llm_connections/route.ts
 * @description Unified API endpoint for managing LLM connections.
 *
 * This API route provides CRUD (Create, Read, Update, Delete) functionality for llm_connections.
 * It leverages the database service abstraction layer (`@/lib/services/db.ts`) to seamlessly
 * switch between Firebase Firestore (development) and Tencent CloudBase (production).
 *
 * This is the corrected implementation, replacing the previous file-based mock.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'llm_connections';

// Helper to extract ID from request URL for PUT/DELETE
function getIdFromRequest(req: Request): string | null {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    // Expects URL format like /api/llm_connections/some_id
    return parts.length === 4 ? parts[3] : null;
}

/**
 * GET /api/llm_connections
 * Fetches all LLM connections, ordered by priority.
 * Can be filtered by `category` query parameter.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        let connections: any[] = [];

        if (dbType === 'firestore') {
            const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
            const llmsCollection = collection(db, COLLECTION_NAME);
            
            // Base query with ordering
            let queries = [orderBy('priority')];

            // Add category filter if present
            if (category) {
                queries.unshift(where('category', '==', category));
            }

            const q = query(llmsCollection, ...queries);
            const snapshot = await getDocs(q);
            connections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } else if (dbType === 'tcb') {
            let query = db.collection(COLLECTION_NAME).orderBy('priority', 'asc');

            // Add category filter if present
            if (category) {
                query = query.where({ category });
            }
            const snapshot = await query.get();
            connections = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }

        return NextResponse.json(connections);
    } catch (error: any) {
        console.error('[API /llm_connections GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/llm_connections
 * Creates a new LLM connection.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const dataToSave = { ...body, createdAt: new Date().toISOString() };
        
        let newId: string;
        if (dbType === 'firestore') {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...body,
                createdAt: serverTimestamp(),
            });
            newId = docRef.id;
        } else if (dbType === 'tcb') {
            const result = await db.collection(COLLECTION_NAME).add({
                ...body,
                createdAt: db.serverDate(),
            });
            newId = result.id || result._id;
        } else {
             throw new Error('Database service is not properly configured.');
        }

        return NextResponse.json({ id: newId, ...dataToSave }, { status: 201 });
    } catch (error: any) {
        console.error('[API /llm_connections POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create item', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/llm_connections/[id]
 * Updates an existing LLM connection.
 */
export async function PUT(req: Request) {
    try {
        const id = getIdFromRequest(req);
        if (!id) {
            return NextResponse.json({ error: 'Missing ID in request URL' }, { status: 400 });
        }

        const body = await req.json();
        // Remove id from body to avoid conflicts
        const { id: bodyId, _id, ...dataToUpdate } = body;

        if (dbType === 'firestore') {
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, COLLECTION_NAME, id), dataToUpdate);
        } else if (dbType === 'tcb') {
            await db.collection(COLLECTION_NAME).doc(id).update(dataToUpdate);
        }

        return NextResponse.json({ id, ...dataToUpdate });
    } catch (error: any) {
        console.error('[API /llm_connections PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update item', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/llm_connections/[id]
 * Deletes an LLM connection.
 */
export async function DELETE(req: Request) {
    try {
        const id = getIdFromRequest(req);
        if (!id) {
            return NextResponse.json({ error: 'Missing ID in request URL' }, { status: 400 });
        }

        if (dbType === 'firestore') {
            const { doc, deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } else if (dbType === 'tcb') {
            await db.collection(COLLECTION_NAME).doc(id).remove();
        }

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('[API /llm_connections DELETE] Error:', error);
        return NextResponse.json({ error: 'Failed to delete item', details: error.message }, { status: 500 });
    }
}
