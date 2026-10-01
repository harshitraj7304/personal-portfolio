/**
 * POST /api/auth/verify-otp — exchange a valid code for a session.
 *
 * HOW THE SESSION IS MINTED WITHOUT A PASSWORD
 * Our OTP is ours, not Supabase's — it lives in `otp_codes` and is verified
 * here. But the session must come from Supabase Auth, since that is what issues
 * the JWT that RLS reads.
 *
 * So after OUR code is verified, we mint a Supabase magic-link token via the
 * admin API and immediately redeem it server-side. The link is never emailed and
 * never leaves this function; it is purely the mechanism that converts a
 * verified identity into a real Supabase session.
 *
 * The ordering is what makes this safe: generateLink() is only reached AFTER our
 * own code has been verified and consumed. Reaching it any other way would be
 * an authentication bypass, so nothing else in the codebase calls it.
 */

import {
  establishSession,
  findAdminByIdentifier,
  publicSessionShape,
  verifyOtp,
} from '../_lib/auth.js'
import { logActivity, logLoginAttempt } from '../_lib/audit.js'
import { clientIp, handler, json, readJson, serverError, unauthorized } from '../_lib/http.js'
import { LIMITS, bucketKey, enforceRateLimit } from '../_lib/rate-limit.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { parseBody, verifyOtpSchema } from '../_lib/validate.js'

/** One message for every failure mode — see login.js for the reasoning. */
const GENERIC_FAILURE = 'That code is invalid or has expired'

export default handler(
  async (req, res) => {
    const body = await readJson(req)
    const { identifier, code } = parseBody(verifyOtpSchema, body)
    const ip = clientIp(req)

    await enforceRateLimit(bucketKey('otp-verify', identifier), LIMITS.OTP_VERIFY, res)
    await enforceRateLimit(bucketKey('otp-verify-ip', ip), LIMITS.OTP_VERIFY, res)

    const admin = await findAdminByIdentifier(identifier)
    if (!admin || !admin.is_active) {
      await logLoginAttempt({ req, identifier, successful: false, reason: 'otp_unknown_identifier' })
      throw unauthorized(GENERIC_FAILURE)
    }

    // Codes are always stored against the canonical email, even when the user
    // typed a phone number, so verification looks it up the same way.
    const result = await verifyOtp({ identifier: admin.email, purpose: 'login', code })

    if (!result.ok) {
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: `otp_${result.reason}`,
      })
      throw unauthorized(GENERIC_FAILURE)
    }

    // ── Our code is verified and consumed. Mint the Supabase session. ──
    const { data: linkData, error: linkError } = await supabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email: admin.email,
    })

    const hashedToken = linkData?.properties?.hashed_token
    if (linkError || !hashedToken) {
      console.error('[auth] failed to generate session token:', linkError?.message)
      throw serverError('Could not complete sign-in. Please try again.')
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin().auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    })

    if (sessionError || !sessionData?.session || !sessionData?.user) {
      console.error('[auth] failed to redeem session token:', sessionError?.message)
      throw serverError('Could not complete sign-in. Please try again.')
    }

    // Same defence-in-depth identity check as password login.
    if (sessionData.user.id !== admin.id) {
      await logLoginAttempt({ req, identifier, successful: false, reason: 'otp_identity_mismatch' })
      throw unauthorized(GENERIC_FAILURE)
    }

    const csrfToken = establishSession(res, sessionData.session)

    await supabaseAdmin()
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id)

    await logLoginAttempt({ req, identifier, successful: true, reason: 'otp' })
    await logActivity({
      req,
      actorId: admin.id,
      actorLabel: admin.email,
      action: 'auth.login',
      summary: `Signed in with an email code from ${ip ?? 'unknown IP'}`,
    })

    json(res, 200, { ...publicSessionShape({ admin }), csrfToken })
  },
  { methods: ['POST'] },
)
