/**
 * Rate limiting.
 *
 * Backed by the SQL function app_rate_limit_hit(), which performs the whole
 * check-and-increment in a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING.
 *
 * Doing this in JavaScript — read the counter, compare, write it back — races
 * against itself the moment two requests arrive together, which is exactly the
 * condition an attacker manufactures. Serverless makes it worse: concurrent
 * invocations are separate processes, so an in-memory counter is not merely
 * racy, it is per-instance and effectively absent.
 */

import { supabaseAdmin } from './supabase.js'
import { tooManyRequests } from './http.js'

/** Named policies, so limits are visible in one place rather than scattered. */
export const LIMITS = {
  // Auth
  LOGIN_IDENTIFIER: { limit: 5, window: 900 }, // 5 per 15 min per account
  LOGIN_IP: { limit: 20, window: 900 }, // 20 per 15 min per IP
  OTP_REQUEST: { limit: 3, window: 900 }, // 3 codes per 15 min
  OTP_VERIFY: { limit: 10, window: 900 },
  PASSWORD_RESET: { limit: 3, window: 3600 },

  // Public surfaces
  CONTACT_IP_HOUR: { limit: 3, window: 3600 },
  CONTACT_IP_DAY: { limit: 10, window: 86400 },
  SHARE_ACCESS: { limit: 60, window: 3600 },
  AI_PUBLIC: { limit: 20, window: 3600 },

  // Generic
  API_GENERAL: { limit: 120, window: 60 },
}

/**
 * Record a hit and report whether it is allowed.
 *
 * Fails OPEN on infrastructure error. That is a deliberate trade: if the
 * database is unreachable the rate limiter cannot function, and refusing all
 * traffic would convert a limiter outage into a full site outage. Every caller
 * of this function has an independent gate behind it (password check, OTP
 * digest comparison, admin session), so failing open degrades defence in depth
 * rather than removing authentication.
 */
export async function checkRateLimit(bucket, policy) {
  const { limit, window } = policy

  try {
    const { data, error } = await supabaseAdmin().rpc('app_rate_limit_hit', {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: window,
    })

    if (error) {
      console.error('[rate-limit] rpc failed, failing open:', error.message)
      return { allowed: true, remaining: limit, resetAt: null, degraded: true }
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      allowed: Boolean(row?.allowed),
      remaining: row?.remaining ?? 0,
      resetAt: row?.reset_at ?? null,
      degraded: false,
    }
  } catch (err) {
    console.error('[rate-limit] unexpected failure, failing open:', err.message)
    return { allowed: true, remaining: limit, resetAt: null, degraded: true }
  }
}

/** Check and throw 429 when exceeded. Sets Retry-After when `res` is supplied. */
export async function enforceRateLimit(bucket, policy, res = null) {
  const result = await checkRateLimit(bucket, policy)

  if (!result.allowed) {
    if (res && result.resetAt) {
      const seconds = Math.max(1, Math.ceil((new Date(result.resetAt) - Date.now()) / 1000))
      res.setHeader('Retry-After', String(seconds))
    }
    throw tooManyRequests('Too many requests. Please wait and try again.')
  }

  return result
}

/**
 * Bucket key builder.
 *
 * Identifiers are lowercased and truncated so 'A@B.com' and 'a@b.com' cannot be
 * used to buy two separate quotas, and so a pathological identifier cannot
 * bloat the primary key.
 */
export function bucketKey(scope, identifier) {
  const clean = String(identifier ?? 'unknown')
    .toLowerCase()
    .slice(0, 160)
  return `${scope}:${clean}`
}
