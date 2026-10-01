/**
 * POST /api/auth/request-otp — email a one-time sign-in code.
 *
 * ANTI-ENUMERATION: this endpoint returns the same 200 body whether or not the
 * account exists. If it 404'd on unknown identifiers, anyone could discover
 * valid admin emails by trying a list. The work is skipped internally; the
 * response is indistinguishable from outside.
 */

import { findAdminByIdentifier, issueOtp } from '../_lib/auth.js'
import { logLoginAttempt } from '../_lib/audit.js'
import { config } from '../_lib/env.js'
import { clientIp, handler, json, readJson, userAgent } from '../_lib/http.js'
import { otpEmail, sendEmail } from '../_lib/mailer.js'
import { LIMITS, bucketKey, enforceRateLimit } from '../_lib/rate-limit.js'
import { parseBody, requestOtpSchema } from '../_lib/validate.js'

/** Identical for every outcome. */
const UNIFORM_RESPONSE = {
  ok: true,
  message: 'If that account exists, a sign-in code is on its way.',
}

export default handler(
  async (req, res) => {
    const body = await readJson(req)
    const { identifier, purpose } = parseBody(requestOtpSchema, body)
    const ip = clientIp(req)

    // Limit both axes: per-identifier stops mailbox flooding of one account,
    // per-IP stops an attacker cycling identifiers to send mail at scale.
    await enforceRateLimit(bucketKey(`otp:${purpose}`, identifier), LIMITS.OTP_REQUEST, res)
    await enforceRateLimit(bucketKey('otp-ip', ip), LIMITS.OTP_REQUEST, res)

    const admin = await findAdminByIdentifier(identifier)

    if (!admin || !admin.is_active) {
      // Recorded so repeated probing is visible in login_attempts, while the
      // caller learns nothing.
      await logLoginAttempt({
        req,
        identifier,
        successful: false,
        reason: 'otp_request_unknown_identifier',
      })
      return json(res, 200, UNIFORM_RESPONSE)
    }

    // SMS is not wired up (India requires DLT registration plus a paid gateway),
    // so a phone identifier still receives its code by email. otp_codes.channel
    // already models 'sms', making that a provider integration later, not a
    // schema change.
    const { code } = await issueOtp({
      identifier: admin.email,
      purpose,
      channel: 'email',
      ip,
      userAgent: userAgent(req),
    })

    const template = otpEmail({
      code,
      purpose,
      ttlMinutes: Math.round(config.otpTtlSeconds / 60),
    })

    const result = await sendEmail({ to: admin.email, ...template })

    if (!result.ok) {
      // Deliberately still 200. A 503 here would tell an attacker that the
      // account exists (a non-existent one returns 200 immediately), so the
      // failure is logged for you and hidden from them.
      console.error('[auth] OTP email delivery failed for an existing account')
    }

    json(res, 200, UNIFORM_RESPONSE)
  },
  { methods: ['POST'] },
)
