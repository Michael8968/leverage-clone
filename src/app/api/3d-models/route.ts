
/**
 * @file src/app/api/3d-models/route.ts
 * @description API endpoint for initiating 3D model generation tasks.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

// A mock function to simulate calling an external 3D model generation API
// In a real application, this would contain the actual fetch() call to the provider's API.
async function initiateGeneration(provider: string, modelName: string, apiKey: string, prompt: string): Promise<any> {
    console.log(`Initiating 3D model generation with ${provider} (${modelName}) for prompt: "${prompt}"`);
    
    // Example for Tripo3D
    if (provider.toLowerCase() === 'tripo3d') {
        const response = await fetch('https://api.tripo3d.ai/v2/sculpt/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ type: 'text_to_sculpt', prompt }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Tripo3D API error: ${error.message}`);
        }
        const data = await response.json();
        return { taskId: data.data.task_id, estimatedTime: 120 };
    }

    // Add other providers here...

    // Fallback mock response
    // In a real implementation, you'd throw an error if the provider is unknown.
    console.warn(`No specific implementation for provider: ${provider}. Using mock response.`);
    return Promise.resolve({
        taskId: `mock_${Date.now()}`,
        estimatedTime: 180, // in seconds
    });
}

/**
 * POST /api/3d-models
 * Initiates a 3D model generation task.
 */
export async function POST(req: Request) {
    try {
        const { prompt, providerId, apiKey: personalApiKey } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        let provider = 'Unknown';
        let modelName = 'default';
        let apiKey = personalApiKey;
        let providerInfo;

        // If a providerId is given, fetch its details.
        if (providerId) {
             if (dbType === 'firestore') {
                const { doc, getDoc } = await import('firebase/firestore');
                const llmRef = doc(db, 'llm_connections', providerId);
                const llmSnap = await getDoc(llmRef);
                if (!llmSnap.exists()) {
                    return NextResponse.json({ error: 'Specified 3D service provider not found.' }, { status: 404 });
                }
                providerInfo = llmSnap.data();
            } else if (dbType === 'tcb') {
                const snapshot = await db.collection('llm_connections').doc(providerId).get();
                if (!snapshot.data || snapshot.data.length === 0) {
                     return NextResponse.json({ error: 'Specified 3D service provider not found.' }, { status: 404 });
                }
                providerInfo = snapshot.data[0];
            }
            
            provider = providerInfo.provider;
            modelName = providerInfo.modelName;
            // Use the global API key if no personal key is provided
            if (!apiKey) {
                apiKey = providerInfo.apiKey;
            }
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required. Provide a personal key or configure a global key for the service.' }, { status: 400 });
        }

        const generationResult = await initiateGeneration(provider, modelName, apiKey, prompt);

        return NextResponse.json({
            taskId: generationResult.taskId,
            provider: provider,
            estimatedTime: generationResult.estimatedTime,
        });

    } catch (error: any) {
        console.error('[API /3d-models POST] Error:', error);
        return NextResponse.json({ error: 'Failed to start 3D model generation', details: error.message }, { status: 500 });
    }
}
