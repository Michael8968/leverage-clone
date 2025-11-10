
import { NextResponse } from 'next/server';
import { db } from '@/lib/tcb';

const promptsCollection = db.collection('prompts');

export async function GET() {
    try {
        const result = await promptsCollection.get();
        return NextResponse.json({ prompts: result.data });
    } catch (error: any) {
        return NextResponse.json({ message: `获取提示词失败: ${error.message}` }, { status: 500 });
    }
}
