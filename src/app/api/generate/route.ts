import { NextRequest, NextResponse } from 'next/server';

// This is a proxy endpoint for non-native Genkit providers, like LiteLLM.
// It receives a request, adds the required API key from server-side environment variables,
// and forwards it to the actual LLM provider endpoint.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        const { model, messages, temperature, apiKey } = body;

        if (!model || !messages) {
            return new NextResponse(JSON.stringify({ message: "Missing model or messages in request body." }), { status: 400 });
        }

        // The API Key should be passed in the body from the secure server-side flow.
        if (!apiKey) {
            return new NextResponse(JSON.stringify({ message: "API key is missing." }), { status: 401 });
        }

        const proxyRequestBody = {
            model: model,
            messages: messages,
            temperature: temperature,
        };
        
        // This assumes the LITELLM_PROXY_URL points to a LiteLLM instance.
        const proxyUrl = process.env.LITELLM_PROXY_URL;

        if (!proxyUrl) {
             return new NextResponse(
                JSON.stringify({ 
                    message: 'Proxy URL is not configured.', 
                    details: 'The LITELLM_PROXY_URL environment variable is not set.'
                }), 
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const response = await fetch(`${proxyUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(proxyRequestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("LiteLLM Proxy Error:", errorBody);
            // Return the actual error from the proxy
            return new NextResponse(errorBody, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error in AI Gateway Proxy (/api/generate):", error);
        // This will now catch the "fetch failed" error if the proxyUrl is unreachable.
        const errorMessage = (error.cause as any)?.code === 'UND_ERR_CONNECT_FAILED'
            ? 'Failed to connect to the configured proxy URL. Please ensure the proxy service is running and accessible.'
            : error.message;

        return new NextResponse(
            JSON.stringify({ 
                message: 'Error processing AI request via proxy.', 
                details: errorMessage
            }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
