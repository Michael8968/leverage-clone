
/**
 * @file src/app/api/media-assets/route.ts
 * @description API endpoint for generating secure upload URLs for media assets.
 */

import { NextResponse } from 'next/server';
import { getDb, getStorage } from '@/lib/services/db';

const COLLECTION_NAME = 'media_assets';

/**
 * POST /api/media-assets
 * Creates a record in the database and returns a signed upload URL.
 */
export async function POST(req: Request) {
    try {
        const { userId, fileName, contentType } = await req.json();

        if (!userId || !fileName || !contentType) {
            return NextResponse.json({ error: 'userId, fileName, and contentType are required' }, { status: 400 });
        }

        const db = getDb();
        let mediaAssetId: string;
        let publicUrl: string;

        // Step 1: Create a document in the database to get an ID. (TCB only)
        const result = await db.collection(COLLECTION_NAME).add({
            userId,
            fileName,
            contentType,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
        mediaAssetId = result?.id || result?._id;

        // Step 2: Generate the signed upload URL.
        const storage = getStorage();
        const filePath = `media_assets/${userId}/${mediaAssetId}-${fileName}`;
        let uploadUrl: string;

        // 仅支持 TCB 获取直传 URL
        const meta = await (storage as any).getUploadMetadata?.({ cloudPath: filePath });
        uploadUrl = meta?.url || '';

        // 构建公共访问 URL（依据你的 CDN/静态资源域名设置）
        const publicBase = process.env.NEXT_PUBLIC_TCB_PUBLIC_BASE || process.env.NEXT_PUBLIC_ASSETS_BASE;
        publicUrl = publicBase
            ? `${publicBase.replace(/\/$/, '')}/${filePath}`
            : `/media/${filePath}`; // Fallback 相对路径

        // Step 3: Update the database record with the final public URL.
       await db.collection(COLLECTION_NAME).doc(mediaAssetId).update({ publicUrl });

        return NextResponse.json({ uploadUrl, mediaAssetId, publicUrl });

    } catch (error: any) {
        console.error('[API /media-assets POST] Error:', error);
        // Check for specific GCS permission errors
        if (error.message.includes('iam.gserviceaccount.com does not have storage.objects.create access')) {
             return NextResponse.json({ 
                error: 'Storage Permission Error',
                details: "The service account for your Next.js backend doesn't have permission to create objects in Google Cloud Storage. Please grant the 'Storage Object Creator' role to the service account."
            }, { status: 500 });
        }
        return NextResponse.json({ error: 'Failed to generate upload URL', details: error.message }, { status: 500 });
    }
}
