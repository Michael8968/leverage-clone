
/**
 * @file src/app/api/media-assets/route.ts
 * @description API endpoint for generating secure upload URLs for media assets.
 */

import { NextResponse } from 'next/server';
import { db, dbType, getStorage } from '@/lib/services/db';

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

        let mediaAssetId: string;
        let publicUrl: string;

        // Step 1: Create a document in the database to get an ID.
        if (dbType === 'firestore') {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                userId,
                fileName,
                contentType,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            mediaAssetId = docRef.id;
        } else if (dbType === 'tcb') {
            const result = await db.collection(COLLECTION_NAME).add({
                userId,
                fileName,
                contentType,
                status: 'pending',
                createdAt: db.serverDate(),
            });
            mediaAssetId = result.id || result._id;
        }

        // Step 2: Generate the signed upload URL.
        const storage = getStorage();
        const filePath = `media_assets/${userId}/${mediaAssetId}-${fileName}`;
        let uploadUrl: string;

        if (dbType === 'firestore') {
            const { ref, getDownloadURL } = await import('firebase/storage');
            const { getSignedUrl } = await import('@google-cloud/storage');
            
            // This is a simplified approach. In a real app, you would use a backend admin SDK
            // to generate a signed URL for uploading. The client-side `getDownloadURL` isn't for uploads.
            // For this project, we will simulate the signed URL generation.
            // This part of the code is illustrative and may need adjustment based on the actual backend setup.
            
            // Correct server-side signed URL generation for uploads:
            const gcsBucket = (storage as any).bucket;
            const file = gcsBucket.file(filePath);
            const options = {
                version: 'v4' as const,
                action: 'write' as const,
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType: contentType,
            };
            [uploadUrl] = await file.getSignedUrl(options);

             // Construct the public URL after upload
            const publicBase = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_PUBLIC_BASE || `https://storage.googleapis.com/${gcsBucket.name}`;
            publicUrl = `${publicBase}/${filePath}`;

        } else if (dbType === 'tcb') {
            const result = await (storage as any).getUploadMetadata({ cloudPath: filePath });
            uploadUrl = result.url; // TCB provides the direct upload URL

            // Construct the public URL for TCB/COS
            const publicBase = process.env.NEXT_PUBLIC_TCB_PUBLIC_BASE || process.env.NEXT_PUBLIC_ASSETS_BASE;
            publicUrl = publicBase
                ? `${publicBase.replace(/\/$/, '')}/${filePath}`
                : `/media/${filePath}`; // Fallback relative path
        }

        // Step 3: Update the database record with the final public URL.
        if (dbType === 'firestore') {
             const { doc, updateDoc } = await import('firebase/firestore');
             await updateDoc(doc(db, COLLECTION_NAME, mediaAssetId), { publicUrl });
        } else if (dbType === 'tcb') {
             await db.collection(COLLECTION_NAME).doc(mediaAssetId).update({ publicUrl });
        }

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
