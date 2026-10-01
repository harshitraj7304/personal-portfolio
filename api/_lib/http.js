/**
 * HTTP helpers for Vercel serverless handlers.
 *
 * Plain `(req, res)` Node signatures — no framework. That keeps every handler
 * portable to Express or Next.js route handlers later without a rewrite.
 */

import { isDevelopment } from './env.js'

/** Send JSON with no-store caching (correct default for anything authenticated). */
export function json(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}

/** Send JSON that may be cached by the CDN. Public content only. */
export function jsonCached(res, status, body, { sMaxAge = 60, swr = 600 } = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  )
  res.end(JSON.stringify(body))
}

export function noContent(res) {
  res.statusCode = 204
  res.end()
}

export function redirect(res, location, status = 302) {
  res.statusCode = status
  res.setHeader('Location', location)
  // A signed URL must never be cached by a shared cache.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end()
}

/**
 * Typed error carrying an HTTP status.
 *
 * `expose` distinguishes messages that are safe for the client from internal
 * detail. Anything not explicitly exposed becomes a generic message in
 * production, so a stack trace or database error never reaches a browser.
 */
export class HttpError extends Error {
  constructor(status, message, { code, details, expose = true } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
    this.expose = expose
  }
}

export const badRequest = (m = 'Invalid request', o) => new HttpError(400, m, o)
export const unauthorized = (m = 'Authentication required', o) => new HttpError(401, m, o)
export const forbidden = (m = 'Not permitted', o) => new HttpError(403, m, o)
/**
 * Used for unauthorized access to private objects as well as genuinely missing
 * ones. A 403 confirms that a document exists; a 404 does not. For a private
 * vault, not leaking existence matters more than returning the precise status.
 */
export const notFound = (m = 'Not found', o) => new HttpError(404, m, o)
export const tooManyRequests = (m = 'Too many requests', o) => new HttpError(429, m, o)
export const serverError = (m = 'Something went wrong', o) =>
  new HttpError(500, m, { expose: false, ...o })

/**
 * Wrap a handler so no exception escapes as an unhandled rejection.
 *
 * Also normalises method handling and CORS. CORS is deliberately same-origin
 * only: the browser and the API share an origin, so there is no legitimate
 * cross-origin caller, and permitting one would weaken the cookie-based
 * session model.
 */
export function handler(fn, { methods = ['GET'] } = {}) {
  const allowed = methods.map((m) => m.toUpperCase())

  return async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.setHeader('Allow', [...allowed, 'OPTIONS'].join(', '))
        return noContent(res)
      }

      if (!allowed.includes(req.method)) {
        res.setHeader('Allow', allowed.join(', '))
        throw new HttpError(405, `Method ${req.method} not allowed`)
      }

      await fn(req, res)
    } catch (err) {
      sendError(res, err)
    }
  }
}

function sendError(res, err) {
  const status = err instanceof HttpError ? err.status : 500

  // Always log server-side; 5xx get full detail.
  if (status >= 500) {
    console.error('[api] unhandled error:', err)
  } else {
    console.warn(`[api] ${status}: ${err.message}`)
  }

  const safeMessage =
    err instanceof HttpError && err.expose ? err.message : 'Something went wrong'

  const body = { error: safeMessage }
  if (err instanceof HttpError && err.code) body.code = err.code
  if (err instanceof HttpError && err.expose && err.details) body.details = err.details
  // Stack traces are development-only, never in production responses.
  if (isDevelopment() && status >= 500) body.debug = err.message

  if (res.headersSent) return
  json(res, status, body)
}

/**
 * Parse a JSON body.
 *
 * Vercel usually pre-parses `req.body`, but not on every runtime path, so we
 * fall back to reading the stream. The 1 MB cap stops a trivially large body
 * from consuming function memory.
 */
export async function readJson(req, { maxBytes = 1_000_000 } = {}) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch {
        throw badRequest('Request body is not valid JSON')
      }
    }
    return req.body
  }

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw badRequest('Request body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw badRequest('Request body is not valid JSON')
  }
}

/**
 * Best-effort client IP.
 *
 * On Vercel, `x-forwarded-for` is set by the platform edge, so the left-most
 * entry is the real client. Behind an arbitrary proxy that header is
 * spoofable — which is why IP is one input to rate limiting, never the sole
 * gate, and identifier-based limits exist alongside it.
 */
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).trim()
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || null
}

export function userAgent(req) {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 500) : null
}
