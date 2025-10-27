// Simple test to invoke the /api/hello route handler directly without HTTP server
import { GET } from '@/app/api/hello/route';

async function main() {
  const res = await GET();
  const text = await res.text();
  console.log(text);
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
