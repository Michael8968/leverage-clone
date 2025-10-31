const BASE = process.env.BASE_URL || 'http://localhost:3000';
const fetch = global.fetch || require('node-fetch');

async function ok(res) {
  const text = await res.text().catch(() => '');
  return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null };
}

async function testCollection(name, sample) {
  console.log(`\n=== Testing ${name} ===`);
  // POST
  let res = await fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sample) }).catch(e => ({ error: e }));
  if (res.error) { console.error('POST failed:', res.error.message); return false; }
  let parsed = await ok(res);
  console.log('POST', parsed.status, parsed.ok);
  if (!parsed.ok) return false;
  const created = parsed.body;
  const id = created?.id || created?._id || created?.data?.id;
  if (!id) { console.warn('POST did not return id, attempting to GET list'); }

  // GET list
  res = await fetch(`${BASE}/api/${name}`);
  parsed = await ok(res);
  console.log('GET list', parsed.status, parsed.ok, 'count=', Array.isArray(parsed.body) ? parsed.body.length : 'n/a');
  if (!parsed.ok) return false;

  // If we have id, try PUT
  if (id) {
    const update = { ...(sample), updatedBySmokeTest: true };
    res = await fetch(`${BASE}/api/${name}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) });
    parsed = await ok(res);
    console.log('PUT', parsed.status, parsed.ok);
    if (!parsed.ok) return false;

    // DELETE
    res = await fetch(`${BASE}/api/${name}/${id}`, { method: 'DELETE' });
    parsed = await ok(res);
    console.log('DELETE', parsed.status, parsed.ok);
    if (!parsed.ok) return false;
  }

  return true;
}

(async () => {
  console.log('Running CRUD smoke tests against', BASE);
  const tests = [
    ['products', { name: 'smoke-product', description: 'smoke test', price: 9.9, category: '测试' }],
    ['suppliers', { name: 'smoke-supplier', shortName: 'smoke', email: 'smoke@example.com' }],
    ['demands', { title: 'smoke-demand', description: 'smoke demand', category: '测试', budget: 1000, requesterId: 'smoke' }],
    ['llm_connections', { provider: 'smoke', modelName: 'smoke-model', apiKey: 'secret', priority: 10, status: '活跃', scope: '通用', category: '文本' }],
    ['ai-scenarios', { name: 'smoke-scenario', description: 'testing', configuredPromptKey: 'smoke' }],
    ['appointments', { creatorId: 'smoke', requesterId: 'smoke', appointmentTime: new Date().toISOString() }],
  ];

  for (const [name, sample] of tests) {
    try {
      const okRes = await testCollection(name, sample);
      console.log(`${name}: ${okRes ? 'OK' : 'FAIL'}`);
    } catch (e) {
      console.error(`${name} ERROR`, e.message || e);
    }
  }

  console.log('\nSmoke tests complete.');
})();
