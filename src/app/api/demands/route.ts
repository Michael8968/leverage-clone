
/**
 * @file src/app/api/demands/route.ts
 * @description API endpoint for managing demands (tasks).
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/services/db';

const COLLECTION_NAME = 'demands';

// Helper to extract ID from request URL
function getIdFromRequest(req: Request): string | null {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    return parts.length === 4 ? parts[3] : null;
}

/**
 * GET /api/demands
 * Fetches all open demands.
 */
export async function GET(req: Request) {
    try {
        const db = getDb();
        const snapshot = await db.collection(COLLECTION_NAME).where({ status: '开放中' }).get();
        const demands = (snapshot?.data || []).map((item: any) => ({ ...item, id: item._id || item.id }));
        return NextResponse.json(demands);
    } catch (error: any) {
        console.error('[API /demands GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch demands', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/demands/[id]
 * Updates a demand, typically to accept a task.
 */
export async function PUT(req: Request) {
    try {
        const id = getIdFromRequest(req);
        if (!id) {
            return NextResponse.json({ error: 'Missing ID in request URL' }, { status: 400 });
        }

        const body = await req.json();
        // Sanitize body to only allow specific fields to be updated
        const { status, creatorId } = body;
        const dataToUpdate: { [key: string]: any } = {};
        if (status) dataToUpdate.status = status;
        if (creatorId) dataToUpdate.creatorId = creatorId;
        
        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const db = getDb();
        await db.collection(COLLECTION_NAME).doc(id).update(dataToUpdate);

        return NextResponse.json({ success: true, id, ...dataToUpdate });
    } catch (error: any) {
        console.error('[API /demands PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update demand', details: error.message }, { status: 500 });
    }
}
