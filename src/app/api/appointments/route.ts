
/**
 * @file src/app/api/appointments/route.ts
 * @description API endpoint for managing appointments.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'appointments';

// Helper to extract ID from request URL
function getIdFromRequest(req: Request): string | null {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    return parts.length === 4 ? parts[3] : null;
}

/**
 * GET /api/appointments
 * Fetches appointments, filtering by creatorId.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const creatorId = searchParams.get('creatorId');

        if (!creatorId) {
            return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
        }

        let appointments: any[] = [];
        if (dbType === 'firestore') {
            const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
            const q = query(collection(db, COLLECTION_NAME), where('creatorId', '==', creatorId));
            const snapshot = await getDocs(q);
            appointments = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: doc.id,
                    ...data,
                    appointmentTime: data.appointmentTime instanceof Timestamp ? data.appointmentTime.toDate().toISOString() : data.appointmentTime,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                 }
            });
        } else if (dbType === 'tcb') {
            const snapshot = await db.collection(COLLECTION_NAME).where({ creatorId }).get();
            appointments = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }

        // Sort by appointment time descending
        appointments.sort((a, b) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime());

        return NextResponse.json(appointments);
    } catch (error: any) {
        console.error('[API /appointments GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch appointments', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/appointments/[id]
 * Updates an appointment, typically its status.
 */
export async function PUT(req: Request) {
    try {
        const id = getIdFromRequest(req);
        if (!id) {
            return NextResponse.json({ error: 'Missing ID in request URL' }, { status: 400 });
        }

        const { status } = await req.json();
        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        if (dbType === 'firestore') {
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, COLLECTION_NAME, id), { status });
        } else if (dbType === 'tcb') {
            await db.collection(COLLECTION_NAME).doc(id).update({ status });
        }

        return NextResponse.json({ success: true, id, status });
    } catch (error: any) {
        console.error('[API /appointments PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update appointment', details: error.message }, { status: 500 });
    }
}
