import { NextResponse } from 'next/server';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt || '';
    const userId: string = body?.userId || 'anonymous';
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    const result = await executePrompt({ prompt, userId });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
