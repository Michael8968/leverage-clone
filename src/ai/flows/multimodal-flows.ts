
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as admin from 'firebase-admin';
import type { MediaAsset } from '@/lib/types';
import { geminiProVision, googleAI } from '@genkit-ai/googleai';

// =================================================================
// Firebase Admin SDK Initialization
// =================================================================
if (!admin.apps.length) {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "your-default-bucket-name.appspot.com";
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: bucketName,
    });
  } catch (e) { console.error('Firebase Admin initialization error', e); }
}

const bucket = admin.storage().bucket();

// =================================================================
// Flow to get a signed URL for a new media asset
// =================================================================

const GetUploadUrlInputSchema = z.object({
    userId: z.string(),
    fileName: z.string(),
    contentType: z.string(),
});

const GetUploadUrlOutputSchema = z.object({
    uploadUrl: z.string(),
    mediaAssetId: z.string(),
});

export const getUploadUrlForMediaAsset = ai.defineFlow(
    { name: 'getUploadUrlForMediaAsset', inputSchema: GetUploadUrlInputSchema, outputSchema: GetUploadUrlOutputSchema },
    async ({ userId, fileName, contentType }) => {
        const mediaAssetRef = doc(collection(db, 'media_assets'));
        const mediaAssetId = mediaAssetRef.id;
        const filePath = `media_assets/${userId}/${mediaAssetId}-${fileName}`;
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        await setDoc(mediaAssetRef, {
            userId,
            storagePath: filePath,
            publicUrl: publicUrl,
            mediaType: contentType.split('/')[0],
            mimeType: contentType,
            status: 'uploading',
            createdAt: serverTimestamp(),
        });

        const [uploadUrl] = await bucket.file(filePath).getSignedUrl({
            version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType,
        });

        return { uploadUrl, mediaAssetId };
    }
);

// =================================================================
// Flow to analyze a media asset with a text prompt
// =================================================================

const AnalyzeMediaAssetInputSchema = z.object({
    mediaAssetId: z.string(),
    prompt: z.string(),
});

const AnalyzeMediaAssetOutputSchema = z.object({
    analysis: z.string(),
});

export const analyzeMediaAsset = ai.defineFlow(
    { name: 'analyzeMediaAsset', inputSchema: AnalyzeMediaAssetInputSchema, outputSchema: AnalyzeMediaAssetOutputSchema },
    async ({ mediaAssetId, prompt }) => {
        const mediaAssetRef = doc(db, 'media_assets', mediaAssetId);
        await updateDoc(mediaAssetRef, { status: 'processing' });
        
        const mediaAssetSnap = await getDoc(mediaAssetRef);
        if (!mediaAssetSnap.exists()) throw new Error("Media asset not found.");
        
        const asset = mediaAssetSnap.data() as MediaAsset;
        if (!asset.publicUrl) throw new Error("Media asset does not have a public URL.");

        const llmResponse = await ai.generate({
            model: googleAI('gemini-pro-vision'),
            prompt: [{ media: { url: asset.publicUrl, contentType: asset.mimeType } }, { text: prompt }],
        });
        
        const analysis = llmResponse.text();
        await updateDoc(mediaAssetRef, { status: 'ready' });

        return { analysis };
    }
);
