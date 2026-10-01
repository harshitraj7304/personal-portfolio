/**
 * Session cookie handling.
 *
 * The session lives in httpOnly cookies rather than localStorage. The Supabase
 * browser client stores its session in localStorage, which any successful XSS
 * can read; for a panel that fronts private documents, a cookie the page's own
 * JavaScript cannot read is a materially better trade.
 *
 * The consequence is that the browser never talks to Supabase directly — all
 * admin traffic goes through /api/*. That is the intended design.
 *
 *   hr_at    access token   httpOnly  — short-lived
 *   hr_rt    refresh token  httpOnly  — long-lived, used for silent refresh
 *   hr_csrf  CSRF token     readable  — double-submit, echoed in x-csrf-token
 */

import { config, isProduction } from './env.js'

export const ACCESS_COOKIE = 'hr_at'
export const REFRESH_COOKIE = 'hr_rt'
export const CSRF_COOKIE = 'hr_csrf'

/** Parse the Cookie header into a plain object. */
export function parseCookies(req) {
  const header = req.headers?.cookie
  if (!header) return {}

  const out = {}
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      out[key] = part.slice(eq + 1).trim()
    }
  }
  return out
}

function serialize(name, value, { maxAge, httpOnly = true, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`]

  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`)
    parts.push(`Expires=${new Date(Date.now() + maxAge * 1000).toUTCString()}`)
  }
  if (httpOnly) parts.push('HttpOnly')

  // SameSite=Lax is the primary CSRF defence: the browser will not attach these
  // cookies to a cross-site POST at all. Strict would break the flow of
  // following an emailed link back into the panel; Lax keeps that working while
  // still blocking cross-site form posts.
  parts.push('SameSite=Lax')

  // Secure is omitted on localhost, where there is no HTTPS and the cookie
  // would otherwise be silently dropped.
  if (isProduction()) parts.push('Secure')

  const domain = config.cookieDomain
  if (domain) parts.push(`Domain=${domain}`)

  return parts.join('; ')
}

/** Append a Set-Cookie without clobbering cookies already queued. */
function appendCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie')
  if (!existing) {
    res.setHeader('Set-Cookie', [cookie])
    return
  }
  res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie])
}

/** Write the full session: access, refresh, and CSRF cookies. */
export function setSessionCookies(res, { accessToken, refreshToken, csrfToken }) {
  appendCookie(res, serialize(ACCESS_COOKIE, accessToken, { maxAge: config.sessionTtl }))

  if (refreshToken) {
    appendCookie(res, serialize(REFRESH_COOKIE, refreshToken, { maxAge: config.refreshTtl }))
  }

  if (csrfToken) {
    // Deliberately NOT httpOnly — the admin UI must read this value to echo it
    // back in the x-csrf-token header. That is the whole double-submit pattern.
    // It is not a secret: it proves the request came from a page on this origin,
    // and an attacker on another origin can neither read it nor set it.
    appendCookie(
      res,
      serialize(CSRF_COOKIE, csrfToken, { maxAge: config.refreshTtl, httpOnly: false }),
    )
  }
}

/** Clear every session cookie. Used by logout and by any auth failure path. */
export function clearSessionCookies(res) {
  for (const [name, httpOnly] of [
    [ACCESS_COOKIE, true],
    [REFRESH_COOKIE, true],
    [CSRF_COOKIE, false],
  ]) {
    appendCookie(res, serialize(name, '', { maxAge: 0, httpOnly }))
  }
}

export function getAccessToken(req) {
  return parseCookies(req)[ACCESS_COOKIE] || null
}

export function getRefreshToken(req) {
  return parseCookies(req)[REFRESH_COOKIE] || null
}

export function getCsrfCookie(req) {
  return parseCookies(req)[CSRF_COOKIE] || null
}
