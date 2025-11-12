
/**
 * @file src/app/api/availabilities/route.ts
 * @description API endpoint for managing creator availability.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/services/db';

const COLLECTION_NAME = 'availabilities';

/**
 * GET /api/availabilities
 * Fetches the availability document for a given userId.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const db = getDb();
        let availability = { slots: [] };
        const snapshot = await db.collection(COLLECTION_NAME).doc(userId).get();
        if (snapshot?.data && snapshot.data.length > 0) {
            availability = snapshot.data[0];
        }

        return NextResponse.json(availability);
    } catch (error: any) {
        console.error('[API /availabilities GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch availability', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/availabilities
 * Updates or creates the availability document for a given userId.
 */
export async function PUT(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const { slots } = await req.json();
        if (!Array.isArray(slots)) {
            return NextResponse.json({ error: 'slots must be an array' }, { status: 400 });
        }

        const db = getDb();
        const slotsToStore = slots.map(slot => new Date(slot));
        const collection = db.collection(COLLECTION_NAME);
        const countResult = await collection.doc(userId).count();
        if (countResult?.total > 0) {
            await collection.doc(userId).update({ slots: slotsToStore });
        } else {
            await collection.add({ _id: userId, slots: slotsToStore });
        }

        return NextResponse.json({ success: true, userId, slots });
    } catch (error: any) {
        console.error('[API /availabilities PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update availability', details: error.message }, { status: 500 });
    }
}
