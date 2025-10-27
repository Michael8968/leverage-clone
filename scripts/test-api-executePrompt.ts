import 'dotenv/config';

async function main() {
  try {
    const mod = await import('@/app/api/executePrompt/route');
    const { POST } = mod as any;
    const body = { prompt: '你好，通过 API Route 直接调用', userId: 'u-api' };
    const req = new Request('http://localhost/api/executePrompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    const json = await (res as Response).json();
    console.log('API route result:', json);
    process.exit(0);
  } catch (e: any) {
    console.error('API route test error:', e?.message || e);
    process.exit(1);
  }
}

main();
