
/**
 * @file src/app/api/prompts/route.ts
 * @description API endpoint to fetch active prompts.
 * This route centralizes the logic for retrieving prompts from the database,
 * supporting both Firebase and TCB through the shared db service.
 */

import { NextResponse } from 'next/server';
import { getDb, getDbType } from '@/lib/services/db';

const COLLECTION_NAME = 'prompts';

/**
 * GET /api/prompts
 * Fetches all active prompts, ordered by name.
 */
export async function GET(req: Request) {
    try {
        const db = getDb();
        const dbType = getDbType();
        // 统一使用 TCB 查询；兼容层已废弃 Firestore 分支
        const snapshot = await db.collection(COLLECTION_NAME)
            .where({ status: '生效中' })
            .orderBy('name', 'asc')
            .get();
        let prompts: any[] = (snapshot?.data || []).map((item: any) => ({ ...item, id: item._id || item.id }));

        // Sort by name as a final step, as TCB might not support ordering on a field different from the where clause field in all cases.
    prompts.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

        return NextResponse.json({ prompts });

    } catch (error: any) {
        console.error('[API /prompts GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts', details: error.message }, { status: 500 });
    }
}
