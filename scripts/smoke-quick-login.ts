#!/usr/bin/env tsx
/**
 * Minimal smoke test for dev quick-login gating
 * - Assumes app server is running at the provided BASE_URL (default http://localhost:3000)
 * - In development/local: /api/dev/test-accounts should be accessible (HTTP 200) and return ok=true
 * - In production: /api/dev/test-accounts should be forbidden (HTTP 403)
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/smoke-quick-login.ts
 *   BASE_URL=http://localhost:3001 npx tsx scripts/smoke-quick-login.ts
 */

import { setTimeout as sleep } from 'node:timers/promises'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function main() {
  const url = `${BASE_URL}/api/dev/test-accounts`
  const env = process.env.NODE_ENV || 'development'
  try {
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()
    if (env === 'development') {
      if (res.ok) {
        try {
          const json = JSON.parse(text)
          if (json && json.ok) {
            console.log('PASS: Dev quick-login endpoint accessible and returned ok=true in development.')
            return process.exit(0)
          }
        } catch {}
        console.log('WARN: Dev endpoint returned non-ok JSON in development:', text)
        return process.exit(2)
      } else {
        console.error('FAIL: Expected 200 in development, got', res.status, text)
        return process.exit(1)
      }
    } else {
      // production path
      if (res.status === 403) {
        console.log('PASS: Dev quick-login endpoint correctly forbidden in production (403).')
        return process.exit(0)
      }
      console.error(`FAIL: Expected 403 in production, got ${res.status}. Body:`, text)
      return process.exit(1)
    }
  } catch (e: any) {
    console.error('ERROR: Request failed. Is the server running?', e?.message || String(e))
    // Gentle backoff and retry once (sometimes boot delay)
    await sleep(500)
    try {
      const res = await fetch(url)
      console.log('Retry status:', res.status)
      const body = await res.text()
      console.log('Retry body:', body)
      return process.exit(res.ok ? 0 : 1)
    } catch (e2: any) {
      console.error('Retry failed:', e2?.message || String(e2))
      return process.exit(1)
    }
  }
}

main()
