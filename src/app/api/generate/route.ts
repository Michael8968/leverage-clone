
import { NextRequest, NextResponse } from 'next/server';
import { getLlmConnections } from '@/lib/repositories/tcb/llmConnections';

export async function POST(req: NextRequest) {
    try {
        const connections = await getLlmConnections();
        
        // Check if there are any active connections.
        if (!connections || connections.length === 0) {
            return new NextResponse(
                JSON.stringify({ 
                    message: '需要先配置LLM (No active LLM connection configured).',
                    details: 'Please configure at least one LLM provider in the admin dashboard.'
                }), 
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // For simplicity, we'll use the first available connection.
        // A more advanced implementation would involve routing logic.
        const activeConnection = connections[0];
        const { model, messages, temperature } = await req.json();

        if (!model || !messages) {
            return new NextResponse(JSON.stringify({ message: "Missing model or messages in request body." }), { status: 400 });
        }

        const proxyRequestBody = {
            model: model,
            messages: messages,
            temperature: temperature,
        };

        // The base URL for the proxy can be part of the connection details.
        const proxyUrl = activeConnection.apiBaseUrl || 'https://api.openai.com/v1'; // Default to OpenAI if not specified

        const response = await fetch(`${proxyUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeConnection.apiKey}`,
            },
            body: JSON.stringify(proxyRequestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("LLM Gateway Error:", errorBody);
            return new NextResponse(errorBody, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error in LLM Gateway (/api/generate):", error);
        const errorMessage = (error.cause as any)?.code === 'UND_ERR_CONNECT_FAILED'
            ? 'Failed to connect to the configured LLM provider.'
            : error.message;

        return new NextResponse(
            JSON.stringify({ 
                message: 'Error processing AI request via gateway.', 
                details: errorMessage
            }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
