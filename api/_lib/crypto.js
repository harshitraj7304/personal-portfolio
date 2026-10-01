/**
 * Cryptographic helpers — OTP codes, share tokens, CSRF tokens.
 *
 * Uses Node's built-in `crypto`. No third-party dependency is needed for any
 * of this, and adding one would only widen the supply-chain surface for code
 * that guards authentication.
 */

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from './env.js'

/**
 * HMAC-SHA256 keyed with AUTH_SECRET.
 *
 * OTP codes and share tokens are stored as digests, never plaintext, so a
 * database dump yields no usable login code and no working share URL. HMAC
 * rather than a bare hash means an attacker who obtains the digests still
 * cannot brute-force a 6-digit space offline without also holding AUTH_SECRET.
 *
 * A domain string is mixed in so a digest computed for one purpose can never be
 * replayed as another (an OTP digest is not a valid share-token digest).
 */
export function hmac(value, domain = 'generic') {
  return createHmac('sha256', config.authSecret).update(`${domain}:${value}`).digest('hex')
}

export const hashOtp = (code) => hmac(code, 'otp')
export const hashShareToken = (token) => hmac(token, 'share')

/**
 * Constant-time comparison.
 *
 * `a === b` on a secret leaks information through timing: it returns as soon as
 * two bytes differ, so response time correlates with how much of the guess was
 * correct. Length is compared first because timingSafeEqual throws on a length
 * mismatch, and length is not the secret here.
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Generate a numeric OTP.
 *
 * `randomInt` is drawn from the CSPRNG and is free of the modulo bias you get
 * from `Math.floor(Math.random() * n)`. Leading zeros are preserved by padding,
 * so the full 10^6 space is actually used.
 */
export function generateOtp(digits = 6) {
  const max = 10 ** digits
  return String(randomInt(0, max)).padStart(digits, '0')
}

/** URL-safe random token — share links, CSRF tokens, upload keys. */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export const generateCsrfToken = () => generateToken(24)

/**
 * Verify the double-submit CSRF pair.
 *
 * SameSite=Lax already blocks cross-site cookie-bearing POSTs in current
 * browsers. This is the second, independent layer: an attacker on another
 * origin can neither read our cookie (same-origin policy) nor set our header
 * (CORS forbids it), so a matching pair can only come from our own page.
 */
export function verifyCsrf(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false
  return safeEqual(cookieToken, headerToken)
}

/**
 * Password strength check, run server-side.
 *
 * Client-side validation is a usability feature and can be bypassed trivially;
 * this is the copy that actually holds. Length is weighted over exotic
 * character requirements because length is what defeats brute force.
 */
export function validatePasswordStrength(password) {
  const errors = []

  if (typeof password !== 'string' || password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  if (password.length > 200) {
    errors.push('Password must be 200 characters or fewer')
  }
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number')

  // Blocks the handful of passwords that appear at the top of every breach
  // corpus. Not a substitute for a real breach-list check, but it costs nothing.
  const common = ['password', '12345678', 'qwerty', 'letmein', 'admin123', 'welcome']
  const lower = String(password).toLowerCase()
  if (common.some((c) => lower.includes(c))) {
    errors.push('Password contains a commonly used sequence')
  }

  return { valid: errors.length === 0, errors }
}

/** Redact a value for logs — keeps enough to identify it, not to use it. */
export function redact(value, keepStart = 4) {
  if (typeof value !== 'string' || value.length === 0) return ''
  if (value.length <= keepStart) return '*'.repeat(value.length)
  return value.slice(0, keepStart) + '*'.repeat(Math.min(value.length - keepStart, 12))
}
