import path from 'path';
import dotenv from 'dotenv';

// Ensure we have env for Hunyuan and datastore selection
dotenv.config();
// Allow .env.local as fallback if needed
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

type Demand = any;

async function listPublicDemands(): Promise<Demand[]> {
  // Prefer API route to exercise repository selection (json vs tcb)
  const mod = await import('@/app/api/demands/route');
  const { GET } = mod as any;
  const url = 'http://localhost/api/demands?type=public';
  const res = await GET(new Request(url));
  const json = await (res as Response).json();
  return Array.isArray(json) ? json : (json?.items || []);
}

async function listCreators(): Promise<any[]> {
  const { getUserRepository } = await import('@/lib/repositories/users');
  const repo = getUserRepository();
  if (typeof (repo as any).findByRole === 'function') {
    const creators = await (repo as any).findByRole('creator');
    return creators || [];
  }
  const all = await repo.list();
  return (all || []).filter((u: any) => String(u.role).toLowerCase() === 'creator');
}

async function recommendForPool(demands: Demand[], creatives: any[]) {
  const { recommendCreatives } = await import('@/ai/flows/demand-matching');
  const openDemands = demands.filter((d: any) => (d?.status || '').includes('开放'));

  const tasks = openDemands.map(async (d) => {
    try {
      const rec = await recommendCreatives({ demand: d, creatives });
      const top = rec?.recommendations?.[0];
      return { id: d.id || d.title, top };
    } catch (e: any) {
      return { id: d.id || d.title, error: e?.message || String(e) };
    }
  });
  return Promise.all(tasks);
}

async function main() {
  const demands = await listPublicDemands();
  const creators = await listCreators();
  const results = await recommendForPool(demands, creators);
  for (const r of results) {
    if ((r as any).error) {
      console.error('AsyncPool:', r.id, 'FAIL', (r as any).error);
    } else {
      const top = (r as any).top;
      console.log('AsyncPool:', r.id, 'TOP:', top?.creativeId, 'score=', top?.matchScore, 'reason=', top?.reason);
    }
  }
}

main().catch((e) => {
  console.error('Run failed:', e?.message || e);
  process.exit(1);
});
