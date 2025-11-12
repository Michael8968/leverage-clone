
/**
 * @file src/app/api/user-settings/route.ts
 * @description API endpoint for updating user-specific settings.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/services/db';

const COLLECTION_NAME = 'users';

/**
 * PUT /api/user-settings/[userId]
 * Updates a user's settings document.
 */
export async function PUT(req: Request) {
    try {
        const url = new URL(req.url);
        const userId = url.pathname.split('/').pop();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required in the URL' }, { status: 400 });
        }

        const body = await req.json();
        
        // Define allowed fields to prevent arbitrary updates
        const allowedFields = ['status', 'aiAssistantEnabled', 'alwaysAvailable', 'assistantRules'];
        const dataToUpdate: { [key: string]: any } = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                dataToUpdate[field] = body[field];
            }
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const db = getDb();
        await db.collection(COLLECTION_NAME).doc(userId).update(dataToUpdate);

        return NextResponse.json({ success: true, userId, ...dataToUpdate });
    } catch (error: any) {
        console.error('[API /user-settings PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update user settings', details: error.message }, { status: 500 });
    }
}
