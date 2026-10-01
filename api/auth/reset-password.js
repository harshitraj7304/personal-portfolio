/**
 * POST /api/auth/reset-password — verify the reset code, then set a new password.
 *
 * Deliberately does NOT sign the user in afterwards. Completing a reset and
 * being handed a live session means a stolen reset code yields immediate access;
 * requiring a fresh login means the new password must also be known. The extra
 * step costs one form submission and closes that gap.
 *
 * Every existing session is revoked as well: if the reset happened because the
 * account was compromised, leaving the attacker's session alive would defeat the
 * point of resetting.
 */

import { findAdminByIdentifier, verifyOtp } from '../_lib/auth.js'
import { logActivity, logLoginAttempt } from '../_lib/audit.js'
import { clearSessionCookies } from '../_lib/cookies.js'
import { validatePasswordStrength } from '../_lib/crypto.js'
import { badRequest, handler, json, readJson, serverError, unauthorized } from '../_lib/http.js'
import { LIMITS, bucketKey, enforceRateLimit } from '../_lib/rate-limit.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { parseBody, resetPasswordSchema } from '../_lib/validate.js'

const GENERIC_FAILURE = 'That code is invalid or has expired'

export default handler(
  async (req, res) => {
    const body = await readJson(req)
    const { identifier, code, password } = parseBody(resetPasswordSchema, body)

    await enforceRateLimit(bucketKey('pwreset-verify', identifier), LIMITS.OTP_VERIFY, res)

    // Strength is checked BEFORE the code is consumed. Otherwise a weak password
    // would burn the user's only valid code and force them to request another.
    const strength = validatePasswordStrength(password)
    if (!strength.valid) {
      throw badRequest('Please choose a stronger password', {
        code: 'weak_password',
        details: { password: strength.errors.join('. ') },
      })
    }

    const admin = await findAdminByIdentifier(identifier)
    if (!admin || !admin.is_active) {
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: 'pwreset_unknown_identifier',
      })
      throw unauthorized(GENERIC_FAILURE)
    }

    const result = await verifyOtp({
      identifier: admin.email,
      purpose: 'password_reset',
      code,
    })

    if (!result.ok) {
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: `pwreset_${result.reason}`,
      })
      throw unauthorized(GENERIC_FAILURE)
    }

    // Supabase hashes the new password with bcrypt. We hand over the plaintext
    // once, over TLS, and never store or log it.
    const { error } = await supabaseAdmin().auth.admin.updateUserById(admin.id, { password })

    if (error) {
      console.error('[auth] password update failed:', error.message)
      throw serverError('Could not update your password. Please try again.')
    }

    // Invalidate every existing session for this account.
    try {
      await supabaseAdmin().auth.admin.signOut(admin.id, 'global')
    } catch (err) {
      console.warn('[auth] could not revoke existing sessions after reset:', err.message)
    }

    // Clear this browser's cookies too, so the state is unambiguous.
    clearSessionCookies(res)

    await logActivity({
      req,
      actorId: admin.id,
      actorLabel: admin.email,
      action: 'auth.password_reset',
      summary: 'Password reset via emailed code; all sessions revoked',
    })

    json(res, 200, {
      ok: true,
      message: 'Your password has been updated. Please sign in with your new password.',
    })
  },
  { methods: ['POST'] },
)
