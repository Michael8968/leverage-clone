
'use server';
// firebase-storage-fetch

import { z } from 'zod';
import { generateWithOpenAI } from '@/ai/hunyuan-client'; // Fallback to OpenAI for vision tasks
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection } from '@/lib/cloudbase-compat';
import { getAdminStorage } from '@/lib/firebase-admin';
import type { MediaAsset } from '@/lib/types';

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

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlInputSchema>;
export type GetUploadUrlOutput = z.infer<typeof GetUploadUrlOutputSchema>;

export async function getUploadUrlForMediaAsset({ userId, fileName, contentType }: GetUploadUrlInput): Promise<GetUploadUrlOutput> {
    try {
        const bucket = getAdminStorage().bucket();
    const mediaAssetRef = doc('media_assets');
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
    } catch (error) {
        console.error('Error in getUploadUrlForMediaAsset:', error);
        throw error;
    }
}

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

export type AnalyzeMediaAssetInput = z.infer<typeof AnalyzeMediaAssetInputSchema>;
export type AnalyzeMediaAssetOutput = z.infer<typeof AnalyzeMediaAssetOutputSchema>;

export async function analyzeMediaAsset({ mediaAssetId, prompt }: AnalyzeMediaAssetInput): Promise<AnalyzeMediaAssetOutput> {
    try {
    const mediaAssetRef = doc('media_assets', mediaAssetId);
        await updateDoc(mediaAssetRef, { status: 'processing' });
        
        const mediaAssetSnap = await getDoc(mediaAssetRef);
        if (!mediaAssetSnap.exists()) throw new Error("Media asset not found.");
        
        const asset = mediaAssetSnap.data() as MediaAsset;
        const bucket = getAdminStorage().bucket();
        // Construct the public URL after upload
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${asset.storagePath}`;

        // Update the document with the final public URL
        await updateDoc(mediaAssetRef, { publicUrl });

        // Note: Hunyuan currently does not support multimodal (vision) tasks
        // Using OpenAI fallback for image analysis
        // TODO: Update when Hunyuan adds vision support
        
        // For vision tasks, we need to use a different approach
        // Since generateWithOpenAI doesn't support vision, we'll make a direct API call
        const analysis = await analyzeImageWithOpenAI(publicUrl, prompt, asset.userId);
        
        await updateDoc(mediaAssetRef, { status: 'ready', analysis: analysis });

        return { analysis };
    } catch (error) {
        console.error('Error in analyzeMediaAsset:', error);
    const mediaAssetRef = doc('media_assets', mediaAssetId);
        await updateDoc(mediaAssetRef, { status: 'failed' }).catch(console.error);
        throw error;
    }
}

// Helper function for vision analysis with OpenAI
async function analyzeImageWithOpenAI(imageUrl: string, prompt: string, userId: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        throw new Error('OpenAI API key not configured for vision tasks');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No analysis returned';
    } catch (error) {
        console.error('Error calling OpenAI Vision API:', error);
        return 'Image analysis failed. Please try again later.';
    }
}
