/**
 * POST /api/auth/login — email/phone + password.
 *
 * Order of operations matters and is deliberate:
 *   1. rate limit          — before any credential work, so brute force is
 *                            throttled even against valid accounts
 *   2. resolve identifier   — phone is an alias, resolved to an email server-side
 *   3. verify password      — via Supabase Auth; we never see a stored hash
 *   4. check the allowlist  — an auth user who is not an active admin_users row
 *                             is rejected AND their session is revoked
 *   5. issue cookies        — httpOnly access + refresh, plus a CSRF token
 *   6. audit                — success or failure, either way
 */

import { establishSession, findAdminByIdentifier, publicSessionShape } from '../_lib/auth.js'
import { logActivity, logLoginAttempt } from '../_lib/audit.js'
import { clearSessionCookies } from '../_lib/cookies.js'
import { clientIp, handler, json, readJson, unauthorized } from '../_lib/http.js'
import { LIMITS, bucketKey, enforceRateLimit } from '../_lib/rate-limit.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { loginSchema, parseBody } from '../_lib/validate.js'

/**
 * One message for every credential failure.
 *
 * "No such account" versus "wrong password" hands an attacker a free account
 * enumeration oracle. Precise reasons go to login_attempts.reason instead,
 * where only you can read them.
 */
const GENERIC_FAILURE = 'Incorrect email or password'

export default handler(
  async (req, res) => {
    const body = await readJson(req)
    const { identifier, password } = parseBody(loginSchema, body)
    const ip = clientIp(req)

    // Two independent buckets: per-account stops a targeted attack on one
    // login, per-IP stops a spray across many. Either one alone leaves a gap.
    await enforceRateLimit(bucketKey('login', identifier), LIMITS.LOGIN_IDENTIFIER, res)
    await enforceRateLimit(bucketKey('login-ip', ip), LIMITS.LOGIN_IP, res)

    const adminRecord = await findAdminByIdentifier(identifier)

    if (!adminRecord || !adminRecord.is_active) {
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: adminRecord ? 'account_inactive' : 'no_such_admin',
      })
      throw unauthorized(GENERIC_FAILURE)
    }

    // Password verification happens inside Supabase Auth against its bcrypt
    // hash. This application never holds, hashes, or compares a password.
    const { data, error } = await supabaseAdmin().auth.signInWithPassword({
      email: adminRecord.email,
      password,
    })

    if (error || !data?.session || !data?.user) {
      await logLoginAttempt({ req, identifier, successful: false, reason: 'bad_password' })
      throw unauthorized(GENERIC_FAILURE)
    }

    // Defence in depth: confirm the authenticated user is the admin row we
    // resolved. A mismatch should be impossible, so if it happens something is
    // wrong enough to refuse and revoke.
    if (data.user.id !== adminRecord.id) {
      await supabaseAdmin().auth.admin.signOut(data.session.access_token).catch(() => {})
      await logLoginAttempt({ req, identifier, successful: false, reason: 'identity_mismatch' })
      clearSessionCookies(res)
      throw unauthorized(GENERIC_FAILURE)
    }

    const csrfToken = establishSession(res, data.session)

    await supabaseAdmin()
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminRecord.id)

    await logLoginAttempt({ req, identifier, successful: true, reason: 'password' })
    await logActivity({
      req,
      actorId: adminRecord.id,
      actorLabel: adminRecord.email,
      action: 'auth.login',
      summary: `Signed in with password from ${ip ?? 'unknown IP'}`,
    })

    json(res, 200, {
      ...publicSessionShape({ admin: adminRecord }),
      // Returned so a fresh page load can seed its header without reading the
      // cookie. It is not a secret — see cookies.js.
      csrfToken,
    })
  },
  { methods: ['POST'] },
)
