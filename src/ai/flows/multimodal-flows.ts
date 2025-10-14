
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminStorage } from '@/lib/firebase-admin';
import type { MediaAsset } from '@/lib/types';
import { googleAI } from '@genkit-ai/googleai';

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
        const bucket = getAdminStorage().bucket();
        const mediaAssetRef = doc(collection(db, 'media_assets'));
        const mediaAssetId = mediaAssetRef.id;
        const filePath = `media_assets/${userId}/${mediaAssetId}-${fileName}`;
        
        await setDoc(mediaAssetRef, {
            userId,
            storagePath: filePath,
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
        const bucket = getAdminStorage().bucket();
        // Construct the public URL after upload
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${asset.storagePath}`;

        // Update the document with the final public URL
        await updateDoc(mediaAssetRef, { publicUrl });

        const visionPrompt = [
            { media: { url: publicUrl, contentType: asset.mimeType } },
            { text: prompt }
        ];

        const llmResponse = await ai.generate({
            model: googleAI('gemini-pro-vision'),
            prompt: visionPrompt,
        });
        
        const analysis = llmResponse.text();
        await updateDoc(mediaAssetRef, { status: 'ready', analysis: analysis });

        return { analysis };
    }
);
