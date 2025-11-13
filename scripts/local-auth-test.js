(async () => {
  // Node 18+ has global fetch; fallback to node-fetch if needed
  let fetchFn = global.fetch;
  try {
    if (!fetchFn) fetchFn = (await import('node-fetch')).default;
  } catch (e) {
    // ignore
  }

  const base = 'http://localhost:3000';
  const email = 'test-local+dev@example.com';
  const password = 'DevTest123!';

  function mask(obj) {
    try {
      const copy = JSON.parse(JSON.stringify(obj));
      if (copy && typeof copy === 'object') {
        if (copy.token) copy.token = String(copy.token).slice(0, 6) + '...[masked]';
        if (copy.user && copy.user.token) copy.user.token = String(copy.user.token).slice(0, 6) + '...[masked]';
      }
      return copy;
    } catch (e) {
      return obj;
    }
  }

  try {
    console.log('-> POST /api/auth/register');
    const regRes = await fetchFn(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Local Dev' }),
    });
    let regBody;
    try { regBody = await regRes.json(); } catch (e) { regBody = await regRes.text(); }
    console.log('REGISTER', { status: regRes.status, body: mask(regBody) });

    console.log('\n-> POST /api/auth/login');
    const loginRes = await fetchFn(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    let loginBody;
    try { loginBody = await loginRes.json(); } catch (e) { loginBody = await loginRes.text(); }
    console.log('LOGIN', { status: loginRes.status, body: mask(loginBody) });

    const token = (loginBody && loginBody.token) || (regBody && regBody.token);
    if (token) {
      console.log('\n-> GET /api/auth/me');
      const meRes = await fetchFn(base + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      let meBody;
      try { meBody = await meRes.json(); } catch (e) { meBody = await meRes.text(); }
      console.log('ME', { status: meRes.status, body: mask(meBody) });
    } else {
      console.log('\nNo token returned from register/login; skipping /api/auth/me');
    }
  } catch (err) {
    console.error('ERROR while testing auth endpoints:', err);
    process.exitCode = 2;
  }
})();
