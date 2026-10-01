/**
 * GET /api/health
 *
 * Deployment smoke test. Reports which subsystems are configured and whether
 * the database is reachable, without revealing any secret value.
 *
 * This is the first thing to hit after deploying Phase 1: it tells you whether
 * your environment variables landed and whether the migrations ran, in one
 * request, before you try to log in.
 */

import { handler, json } from './_lib/http.js'
import { env, isProduction } from './_lib/env.js'

async function checkDatabase() {
  try {
    // Imported lazily so a missing SUPABASE_URL produces a clean "not
    // configured" report rather than a module-load crash that returns 500 and
    // tells you nothing.
    const { supabaseAdmin } = await import('./_lib/supabase.js')

    const { error } = await supabaseAdmin()
      .from('settings')
      .select('key', { count: 'exact', head: true })
      .limit(1)

    if (error) return { ok: false, detail: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, detail: err.message }
  }
}

export default handler(
  async (req, res) => {
    // Presence checks only. Never echo a value — a health endpoint that prints
    // a key prefix is a health endpoint that leaks a key.
    const configured = {
      supabaseUrl: Boolean(env('SUPABASE_URL')),
      supabaseAnonKey: Boolean(env('SUPABASE_ANON_KEY')),
      supabaseServiceKey: Boolean(env('SUPABASE_SERVICE_ROLE_KEY')),
      authSecret: Boolean(env('AUTH_SECRET')),
      resend: Boolean(env('RESEND_API_KEY')),
      anthropic: Boolean(env('ANTHROPIC_API_KEY')),
    }

    const required = ['supabaseUrl', 'supabaseAnonKey', 'supabaseServiceKey', 'authSecret']
    const missing = required.filter((k) => !configured[k])

    const database = missing.length === 0 ? await checkDatabase() : { ok: false, detail: 'skipped' }

    const healthy = missing.length === 0 && database.ok

    json(res, healthy ? 200 : 503, {
      status: healthy ? 'ok' : 'degraded',
      environment: isProduction() ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      configured,
      missing,
      database,
      // Phase 1 surface, so a deploy can be verified against expectations.
      endpoints: [
        'GET  /api/health',
        'POST /api/auth/login',
        'GET  /api/auth/session',
        'POST /api/auth/logout',
        'POST /api/auth/request-otp',
        'POST /api/auth/verify-otp',
        'POST /api/auth/forgot-password',
        'POST /api/auth/reset-password',
      ],
    })
  },
  { methods: ['GET'] },
)
