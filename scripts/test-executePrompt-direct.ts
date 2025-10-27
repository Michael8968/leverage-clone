import 'dotenv/config';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';

async function main() {
  try {
    const res = await executePrompt({ prompt: '你好，直接调用执行一下', userId: 'u-test' });
    console.log('executePrompt direct result:', res);
    process.exit(0);
  } catch (e: any) {
    console.error('executePrompt direct error:', e?.message || e);
    process.exit(1);
  }
}

main();
