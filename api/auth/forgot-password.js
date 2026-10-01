/**
 * POST /api/auth/forgot-password — send a password-reset code.
 *
 * Same uniform-response discipline as request-otp: an unknown identifier gets
 * the identical 200 body, so this cannot be used to enumerate accounts.
 *
 * A separate purpose ('password_reset') is used rather than reusing the login
 * code. Because OTP digests are domain-separated and looked up by purpose, a
 * code emailed for a password reset cannot be replayed to sign in — which
 * matters, since reset emails are the ones that get forwarded and screenshotted.
 */

import { findAdminByIdentifier, issueOtp } from '../_lib/auth.js'
import { logLoginAttempt } from '../_lib/audit.js'
import { config } from '../_lib/env.js'
import { clientIp, handler, json, readJson, userAgent } from '../_lib/http.js'
import { otpEmail, sendEmail } from '../_lib/mailer.js'
import { LIMITS, bucketKey, enforceRateLimit } from '../_lib/rate-limit.js'
import { forgotPasswordSchema, parseBody } from '../_lib/validate.js'

const UNIFORM_RESPONSE = {
  ok: true,
  message: 'If that account exists, a password reset code is on its way.',
}

export default handler(
  async (req, res) => {
    const body = await readJson(req)
    const { identifier } = parseBody(forgotPasswordSchema, body)
    const ip = clientIp(req)

    // Tighter than the login-OTP limit (3/hour rather than 3/15min): password
    // reset is rare in normal use, so a low ceiling costs nothing and blunts
    // mailbox flooding.
    await enforceRateLimit(bucketKey('pwreset', identifier), LIMITS.PASSWORD_RESET, res)
    await enforceRateLimit(bucketKey('pwreset-ip', ip), LIMITS.PASSWORD_RESET, res)

    const admin = await findAdminByIdentifier(identifier)

    if (!admin || !admin.is_active) {
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: 'pwreset_unknown_identifier',
      })
      return json(res, 200, UNIFORM_RESPONSE)
    }

    const { code } = await issueOtp({
      identifier: admin.email,
      purpose: 'password_reset',
      channel: 'email',
      ip,
      userAgent: userAgent(req),
    })

    const template = otpEmail({
      code,
      purpose: 'password_reset',
      ttlMinutes: Math.round(config.otpTtlSeconds / 60),
    })

    const result = await sendEmail({ to: admin.email, ...template })
    if (!result.ok) {
      console.error('[auth] password reset email delivery failed for an existing account')
    }

    json(res, 200, UNIFORM_RESPONSE)
  },
  { methods: ['POST'] },
)
