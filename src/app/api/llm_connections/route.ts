
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
import { getDb } from '@/lib/services/db';

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

        const db = getDb();
        let query = db.collection(COLLECTION_NAME).orderBy('priority', 'asc');
        if (category) {
            query = query.where({ category });
        }
        const snapshot = await query.get();
        const connections = (snapshot?.data || []).map((item: any) => ({ ...item, id: item._id || item.id }));

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
        const db = getDb();
        const body = await req.json();
        const toSave = { ...body, createdAt: new Date().toISOString() };
        const result = await db.collection(COLLECTION_NAME).add(toSave);
        const newId: string = result?.id || result?._id;
        return NextResponse.json({ id: newId, ...toSave }, { status: 201 });
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

        const db = getDb();
        await db.collection(COLLECTION_NAME).doc(id).update(dataToUpdate);

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

        const db = getDb();
        await db.collection(COLLECTION_NAME).doc(id).remove();

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('[API /llm_connections DELETE] Error:', error);
        return NextResponse.json({ error: 'Failed to delete item', details: error.message }, { status: 500 });
    }
}
