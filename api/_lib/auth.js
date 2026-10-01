/**
 * Authentication and authorization.
 *
 * Two gates protect every admin route, and they are independent:
 *
 *   1. requireAdmin() here — verifies the JWT and the admin_users allowlist.
 *   2. Postgres RLS — re-checks via is_admin() on every row touched.
 *
 * Either alone would be defensible. Both means a mistake in this file does not
 * by itself expose data, and a mistake in a policy does not either.
 */

import {
  ACCESS_COOKIE,
  clearSessionCookies,
  getAccessToken,
  getCsrfCookie,
  getRefreshToken,
  setSessionCookies,
} from './cookies.js'
import { generateCsrfToken, generateOtp, hashOtp, safeEqual, verifyCsrf } from './crypto.js'
import { config } from './env.js'
import { forbidden, unauthorized } from './http.js'
import { supabaseAdmin, supabaseForToken, unwrap } from './supabase.js'

/**
 * Resolve the current session from cookies, refreshing silently if needed.
 *
 * Returns `null` rather than throwing, so public endpoints can call it to
 * personalise output without needing a try/catch.
 */
export async function getSession(req, res) {
  const accessToken = getAccessToken(req)

  if (accessToken) {
    const session = await resolveWithAccessToken(accessToken)
    if (session) return session
  }

  // Access token missing or expired — try a silent refresh so the admin is not
  // logged out every hour.
  const refreshToken = getRefreshToken(req)
  if (!refreshToken) return null

  return refreshSession(refreshToken, res)
}

async function resolveWithAccessToken(accessToken) {
  const client = supabaseForToken(accessToken)

  // getUser() validates the JWT signature and expiry against Supabase. We never
  // decode the token ourselves and trust its claims — an unverified JWT is just
  // a string the client chose.
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data?.user) return null

  const admin = await loadAdminRecord(data.user.id)
  if (!admin) return null

  return { user: data.user, admin, accessToken, client }
}

async function refreshSession(refreshToken, res) {
  const { data, error } = await supabaseAdmin().auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error || !data?.session || !data?.user) {
    // The refresh token is dead. Clear the cookies so the browser stops sending
    // a credential that will never work again.
    if (res) clearSessionCookies(res)
    return null
  }

  const admin = await loadAdminRecord(data.user.id)
  if (!admin) {
    if (res) clearSessionCookies(res)
    return null
  }

  if (res) {
    setSessionCookies(res, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      // CSRF cookie is left as-is on refresh: rotating it would invalidate the
      // token the currently-open admin page is holding, breaking its next POST.
    })
  }

  return {
    user: data.user,
    admin,
    accessToken: data.session.access_token,
    client: supabaseForToken(data.session.access_token),
    refreshed: true,
  }
}

/**
 * Load the admin allowlist row.
 *
 * Uses the service-role client on purpose: this runs *before* we know the caller
 * is an admin, so there is no user context to run it under yet. This is the
 * bootstrap step of authorization, not a data read.
 */
async function loadAdminRecord(userId) {
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, email, full_name, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth] admin lookup failed:', error.message)
    return null
  }
  // Being present in auth.users is NOT sufficient. An inactive or absent row
  // means no admin access, so revoking access is a single boolean update.
  if (!data || !data.is_active) return null

  return data
}

/**
 * Require an authenticated, active admin. Throws 401 otherwise.
 *
 * For mutating methods it also enforces the double-submit CSRF token. Doing the
 * check here rather than per-handler means a new endpoint is protected by
 * default — forgetting to add the check is not possible if you use requireAdmin.
 */
export async function requireAdmin(req, res, { csrf = true } = {}) {
  const session = await getSession(req, res)
  if (!session) throw unauthorized('Please sign in to continue')

  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
  if (csrf && mutating) {
    const cookieToken = getCsrfCookie(req)
    const headerToken = req.headers['x-csrf-token']
    if (!verifyCsrf(cookieToken, Array.isArray(headerToken) ? headerToken[0] : headerToken)) {
      throw forbidden('Invalid or missing CSRF token')
    }
  }

  return session
}

/** Require one of the given roles. Phase 1 seeds only super_admin. */
export async function requireRole(req, res, roles, options) {
  const session = await requireAdmin(req, res, options)
  if (!roles.includes(session.admin.role)) {
    throw forbidden('Your role does not permit this action')
  }
  return session
}

/** Issue the session cookies after a successful credential check. */
export function establishSession(res, session) {
  const csrfToken = generateCsrfToken()
  setSessionCookies(res, {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    csrfToken,
  })
  return csrfToken
}

/** Shape the session object for a client response. Never includes tokens. */
export function publicSessionShape(session) {
  return {
    authenticated: true,
    admin: {
      id: session.admin.id,
      email: session.admin.email,
      name: session.admin.full_name,
      role: session.admin.role,
    },
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  OTP
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create and store an OTP, returning the plaintext code for delivery.
 *
 * Only the HMAC digest is persisted, so the code exists in plaintext solely in
 * this function's return value and in the email that follows.
 */
export async function issueOtp({ identifier, purpose, channel = 'email', ip, userAgent }) {
  const db = supabaseAdmin()
  const normalized = String(identifier).trim().toLowerCase()

  // Invalidate any outstanding code for this identifier+purpose. Without this,
  // requesting a new code would leave earlier codes live, multiplying the number
  // of valid guesses an attacker has at any moment.
  await db
    .from('otp_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('identifier', normalized)
    .eq('purpose', purpose)
    .is('consumed_at', null)

  const code = generateOtp(6)
  const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000).toISOString()

  unwrap(
    await db
      .from('otp_codes')
      .insert({
        identifier: normalized,
        purpose,
        channel,
        code_hash: hashOtp(code),
        max_attempts: config.otpMaxAttempts,
        expires_at: expiresAt,
        ip: ip || null,
        user_agent: userAgent || null,
      })
      .select('id')
      .single(),
    'otp insert',
  )

  return { code, expiresAt }
}

/**
 * Verify an OTP and consume it on success.
 *
 * Returns a discriminated result rather than throwing, because the caller must
 * decide how much to reveal — for login we deliberately collapse several
 * failure reasons into one client-facing message.
 */
export async function verifyOtp({ identifier, purpose, code }) {
  const db = supabaseAdmin()
  const normalized = String(identifier).trim().toLowerCase()

  const { data: rows, error } = await db
    .from('otp_codes')
    .select('id, code_hash, attempts, max_attempts, expires_at, consumed_at')
    .eq('identifier', normalized)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[auth] otp lookup failed:', error.message)
    return { ok: false, reason: 'error' }
  }

  const record = rows?.[0]
  if (!record) return { ok: false, reason: 'not_found' }

  if (new Date(record.expires_at) < new Date()) {
    return { ok: false, reason: 'expired' }
  }

  if (record.attempts >= record.max_attempts) {
    // Burn the code once its attempt budget is spent, so an attacker cannot
    // keep hammering the same row.
    await db
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id)
    return { ok: false, reason: 'too_many_attempts' }
  }

  // Constant-time comparison — a plain === would leak digest bytes via timing.
  if (!safeEqual(record.code_hash, hashOtp(String(code).trim()))) {
    await db
      .from('otp_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id)
    return {
      ok: false,
      reason: 'mismatch',
      attemptsRemaining: Math.max(0, record.max_attempts - record.attempts - 1),
    }
  }

  // Single-use: consumed immediately, so a replay of the same code fails.
  await db.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', record.id)

  return { ok: true }
}

/** Look up an admin by email or phone. Phone is a login alias resolved server-side. */
export async function findAdminByIdentifier(identifier) {
  const raw = String(identifier ?? '').trim()
  if (!raw) return null

  const db = supabaseAdmin()
  const column = raw.includes('@') ? 'email' : 'phone'
  const value = column === 'email' ? raw.toLowerCase() : raw

  const { data, error } = await db
    .from('admin_users')
    .select('id, email, phone, full_name, role, is_active')
    .eq(column, value)
    .maybeSingle()

  if (error) {
    console.error('[auth] identifier lookup failed:', error.message)
    return null
  }
  return data
}

export { ACCESS_COOKIE, clearSessionCookies }
