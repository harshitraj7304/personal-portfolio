/**
 * POST /api/auth/logout
 *
 * Revokes the refresh token server-side, then clears the cookies.
 *
 * Clearing cookies alone would be a false sense of security: the refresh token
 * would remain valid for 30 days, so anyone who had captured it could keep
 * minting access tokens after you "logged out". Revoking it at Supabase is what
 * actually ends the session.
 */

import { getSession } from '../_lib/auth.js'
import { logActivity } from '../_lib/audit.js'
import { clearSessionCookies, getAccessToken } from '../_lib/cookies.js'
import { handler, json } from '../_lib/http.js'
import { supabaseForToken } from '../_lib/supabase.js'

export default handler(
  async (req, res) => {
    const accessToken = getAccessToken(req)

    // Read the session before clearing, so the audit entry can name the actor.
    // `res` is not passed: a refresh during logout would be pointless.
    const session = accessToken ? await getSession(req, null) : null

    if (accessToken) {
      try {
        // scope 'global' invalidates every refresh token for this user, so a
        // session on another device cannot be resurrected either.
        await supabaseForToken(accessToken).auth.signOut({ scope: 'global' })
      } catch (err) {
        // A failed revoke must not block the cookie clear — the local session
        // should always end, even if the network call fails.
        console.warn('[auth] token revocation failed during logout:', err.message)
      }
    }

    clearSessionCookies(res)

    if (session?.admin) {
      await logActivity({
        req,
        actorId: session.admin.id,
        actorLabel: session.admin.email,
        action: 'auth.logout',
        summary: 'Signed out',
      })
    }

    // Idempotent: logging out when already logged out is a success, not a 401.
    json(res, 200, { ok: true, authenticated: false })
  },
  { methods: ['POST'] },
)
