
/**
 * @file src/app/api/3d-models/[taskId]/route.ts
 * @description API endpoint for checking the status of a 3D model generation task.
 */

import { NextResponse } from 'next/server';

// A mock function to simulate fetching the status from an external 3D model generation API.
async function getTaskStatus(provider: string, taskId: string, apiKey: string): Promise<any> {
    console.log(`Fetching status for task ${taskId} from provider ${provider}`);

    if (provider.toLowerCase() === 'tripo3d') {
        const response = await fetch(`https://api.tripo3d.ai/v2/sculpt/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
         if (!response.ok) {
            const error = await response.json();
            throw new Error(`Tripo3D API error: ${error.message}`);
        }
        const data = await response.json();
        // Normalize the Tripo3D response to a common format
        return {
            status: data.data.status, // e.g., 'running', 'success', 'failed'
            progress: data.data.progress,
            output_image_url: data.data.status === 'success' ? data.data.output.images[0].url : null,
        };
    }

    // Fallback mock response for other providers
    console.warn(`No specific implementation for provider: ${provider}. Using mock status.`);
    // Simulate a successful response after a few polls
    const mockProgress = Math.min(100, (Date.now() % 30000) / 300); // Simulate progress over 30s
    if (mockProgress < 100) {
        return {
            status: 'running',
            progress: Math.round(mockProgress),
            status_message: 'AI is sculpting your model...',
        };
    } else {
        return {
            status: 'success',
            progress: 100,
            output_image_url: 'https://via.placeholder.com/512/cccccc/808080.png?text=Mock+3D+Model',
        };
    }
}

/**
 * GET /api/3d-models/[taskId]
 * Checks the status of a 3D model generation task.
 */
export async function GET(req: Request, { params }: { params: { taskId: string } }) {
    try {
        const { taskId } = params;
        const { searchParams } = new URL(req.url);
        const provider = searchParams.get('provider');
        const apiKey = searchParams.get('apiKey'); // The personal API key if provided

        if (!provider || !apiKey) {
            return NextResponse.json({ error: 'Provider and API Key are required for status check' }, { status: 400 });
        }

        const statusResult = await getTaskStatus(provider, taskId, apiKey);

        return NextResponse.json(statusResult);

    } catch (error: any) {
        console.error('[API /3d-models/[taskId] GET] Error:', error);
        return NextResponse.json({ error: 'Failed to check 3D model task status', details: error.message }, { status: 500 });
    }
}
