import { NextRequest, NextResponse } from 'next/server';

// This is a proxy route to call the LiteLLM server.
// It forwards the request from the client to the LiteLLM proxy.

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const liteLLMProxyUrl = process.env.LITELLM_PROXY_URL;

        if (!liteLLMProxyUrl) {
            throw new Error("LITELLM_PROXY_URL environment variable is not set.");
        }
        
        // LiteLLM typically uses the Authorization header for its master key
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        if (process.env.LITELLM_API_KEY) {
             headers.set('Authorization', `Bearer ${process.env.LITELLM_API_KEY}`);
        }

        const response = await fetch(liteLLMProxyUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            // Return a more detailed error to the client
            return new NextResponse(JSON.stringify({ 
                message: `Error from LiteLLM proxy: ${response.statusText}`, 
                details: errorBody 
            }), { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error in /api/generate proxy route:", error);
        return new NextResponse(JSON.stringify({ message: 'Internal Server Error', details: error.message }), { status: 500 });
    }
}
