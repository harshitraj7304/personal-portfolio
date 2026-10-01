/**
 * Request validation schemas.
 *
 * Every request body is parsed through zod before a handler touches it, so a
 * handler can assume its input is well-formed. This is the server-side copy of
 * validation — the client-side checks in Contact.jsx are a usability feature and
 * are trivially bypassed with curl.
 */

import { z } from 'zod'
import { badRequest } from './http.js'

/**
 * Parse and throw a 400 with field-level detail on failure.
 *
 * The details are safe to expose: they describe the caller's own input, not
 * anything about the system's internals.
 */
export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {})

  if (!result.success) {
    const details = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_'
      if (!details[key]) details[key] = issue.message
    }
    throw badRequest('Please check the highlighted fields', { code: 'validation_error', details })
  }

  return result.data
}

// ───────────────────────────────────────────────────────────────────────────
//  Primitives
// ───────────────────────────────────────────────────────────────────────────

/** Trim before validating, so '  a@b.com  ' is accepted rather than rejected. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address')

/**
 * Login identifier: an email or a phone number.
 *
 * Kept loose on purpose — the point is only to reject obvious junk before a
 * database lookup. Real resolution happens in findAdminByIdentifier, and an
 * over-strict phone regex would lock out valid international formats.
 */
const identifier = z
  .string()
  .trim()
  .min(3, 'Enter your email or phone number')
  .max(254, 'Value is too long')

/**
 * Passwords are NOT length-capped low or pattern-restricted at this layer.
 * Strength is enforced by validatePasswordStrength() only where a password is
 * being *set*. Applying strength rules at login would leak the password policy
 * and reject legitimate older credentials.
 */
const password = z.string().min(1, 'Password is required').max(200, 'Password is too long')

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code')

// ───────────────────────────────────────────────────────────────────────────
//  Auth schemas
// ───────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  identifier,
  password,
})

export const requestOtpSchema = z.object({
  identifier,
  purpose: z.enum(['login', 'password_reset']).default('login'),
})

export const verifyOtpSchema = z.object({
  identifier,
  code: otpCode,
})

export const forgotPasswordSchema = z.object({
  identifier,
})

export const resetPasswordSchema = z.object({
  identifier,
  code: otpCode,
  password: z.string().min(1, 'Choose a new password').max(200, 'Password is too long'),
})

export const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: z.string().min(1, 'Choose a new password').max(200, 'Password is too long'),
})

// ───────────────────────────────────────────────────────────────────────────
//  Contact schema (Phase 4) — mirrors the existing client-side validate()
//
//  Defined now so the shape is fixed alongside the rest of the foundation.
// ───────────────────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120, 'Name is too long'),
  email,
  subject: z.string().trim().max(200, 'Subject is too long').optional().default(''),
  message: z
    .string()
    .trim()
    .min(10, 'Please write at least a few words')
    .max(5000, 'Message is too long'),
  // Honeypot: a real user never sees this field, so any value means a bot.
  // Named innocuously because scrapers skip fields called "honeypot".
  company: z.string().max(0, 'Submission rejected').optional().default(''),
  // Milliseconds the form was on screen. Humans take longer than a second.
  elapsedMs: z.number().int().nonnegative().optional(),
})

// ───────────────────────────────────────────────────────────────────────────
//  Shared content primitives (used by later phases)
// ───────────────────────────────────────────────────────────────────────────

export const visibilityEnum = z.enum(['public', 'unlisted', 'private'])
export const statusEnum = z.enum(['draft', 'published', 'archived'])

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only')

/** Rejects javascript: and data: URLs, which are XSS vectors in an href. */
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => v === '' || /^https?:\/\//i.test(v),
    'Enter a full URL starting with http:// or https://',
  )

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})
