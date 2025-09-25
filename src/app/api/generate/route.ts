
import { NextRequest, NextResponse } from 'next/server';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';

// This is now the central, self-contained AI gateway for the entire application.
// It directly invokes the Genkit flow, removing the need for an external LiteLLM proxy.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Directly call the master Genkit flow with the request body.
        // The body should conform to the PromptExecutionInputSchema.
        const result = await executePrompt(body);

        // Return the successful response from the Genkit flow.
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error in AI Gateway (/api/generate):", error);
        
        // Return a structured error response.
        return new NextResponse(
            JSON.stringify({ 
                message: 'Error processing AI request.', 
                details: error.message 
            }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
