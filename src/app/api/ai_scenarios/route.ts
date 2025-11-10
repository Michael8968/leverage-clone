
/**
 * @file src/app/api/ai_scenarios/route.ts
 * @description Unified API endpoint for managing AI Scenarios.
 * This API handles CRUD operations for the 'ai_scenarios' collection,
 * abstracting the database logic for both Firebase and TCB.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'ai_scenarios';

// Helper to extract ID from request URL
function getIdFromRequest(req: Request): string | null {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    return parts.length === 4 ? parts[3] : null;
}

// Helper to convert Firestore Timestamps to ISO strings
function convertTimestamps(data: any): any {
    if (data?.toDate && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestamps);
    }
    if (typeof data === 'object' && data !== null) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, convertTimestamps(value)])
        );
    }
    return data;
}


/**
 * GET /api/ai_scenarios
 * Fetches all AI scenarios, ordered by name.
 */
export async function GET(req: Request) {
    try {
        let scenarios: any[] = [];
        if (dbType === 'firestore') {
            const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
            const scenariosCollection = collection(db, COLLECTION_NAME);
            const q = query(scenariosCollection, orderBy('name'));
            const snapshot = await getDocs(q);
            scenarios = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
        } else if (dbType === 'tcb') {
            const snapshot = await db.collection(COLLECTION_NAME).orderBy('name', 'asc').get();
            scenarios = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }
        return NextResponse.json(scenarios);
    } catch (error: any) {
        console.error('[API /ai_scenarios GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch scenarios', details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/ai_scenarios
 * Creates a new AI scenario.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id: scenarioId, ...data } = body;

        if (!scenarioId) {
            return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
        }

        let finalData: any;

        if (dbType === 'firestore') {
            const { Timestamp, doc, setDoc } = await import('firebase/firestore');
            finalData = {
                ...data,
                createdAt: Timestamp.now(),
                startsAt: data.startsAt ? Timestamp.fromDate(new Date(data.startsAt)) : undefined,
                expiresAt: data.expiresAt ? Timestamp.fromDate(new Date(data.expiresAt)) : undefined,
            };
            // In Firestore, we can set a document with a specific ID directly.
            await setDoc(doc(db, COLLECTION_NAME, scenarioId), finalData);

        } else if (dbType === 'tcb') {
            finalData = {
                _id: scenarioId,
                ...data,
                createdAt: db.serverDate(),
                startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            };
             // TCB uses _id for the document ID.
            await db.collection(COLLECTION_NAME).add(finalData);
        }

        return NextResponse.json({ id: scenarioId, ...finalData }, { status: 201 });
    } catch (error: any) {
        console.error('[API /ai_scenarios POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create scenario', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/ai_scenarios/[id]
 * Updates an existing AI scenario.
 */
export async function PUT(req: Request) {
    try {
        const id = getIdFromRequest(req);
        if (!id) {
            return NextResponse.json({ error: 'Missing ID in request URL' }, { status: 400 });
        }

        const body = await req.json();
        const { id: bodyId, _id, ...dataToUpdate } = body;

        let finalData: any;

        if (dbType === 'firestore') {
            const { Timestamp, doc, updateDoc } = await import('firebase/firestore');
            finalData = {
                ...dataToUpdate,
                startsAt: dataToUpdate.startsAt ? Timestamp.fromDate(new Date(dataToUpdate.startsAt)) : undefined,
                expiresAt: dataToUpdate.expiresAt ? Timestamp.fromDate(new Date(dataToUpdate.expiresAt)) : undefined,
            };
            await updateDoc(doc(db, COLLECTION_NAME, id), finalData);

        } else if (dbType === 'tcb') {
            finalData = {
                ...dataToUpdate,
                startsAt: dataToUpdate.startsAt ? new Date(dataToUpdate.startsAt) : undefined,
                expiresAt: dataToUpdate.expiresAt ? new Date(dataToUpdate.expiresAt) : undefined,
            };
            await db.collection(COLLECTION_NAME).doc(id).update(finalData);
        }

        return NextResponse.json({ id, ...finalData });
    } catch (error: any) {
        console.error('[API /ai_scenarios PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update scenario', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/ai_scenarios/[id]
 * Deletes an AI scenario.
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
        console.error('[API /ai_scenarios DELETE] Error:', error);
        return NextResponse.json({ error: 'Failed to delete scenario', details: error.message }, { status: 500 });
    }
}
