/**
 * GET /api/auth/session
 *
 * Called on admin-panel mount to answer "am I signed in?". Performs a silent
 * refresh when the access token has expired but the refresh token is still
 * valid, so an admin is not logged out every hour mid-edit.
 *
 * Always returns 200. An unauthenticated caller is a normal, expected state
 * (a first visit to /admin), not an error — returning 401 here would fill the
 * browser console with red on every visit.
 */

import { getSession, publicSessionShape } from '../_lib/auth.js'
import { getCsrfCookie } from '../_lib/cookies.js'
import { handler, json } from '../_lib/http.js'

export default handler(
  async (req, res) => {
    const session = await getSession(req, res)

    if (!session) {
      return json(res, 200, { authenticated: false })
    }

    json(res, 200, {
      ...publicSessionShape(session),
      // The client needs this to populate x-csrf-token on later mutations.
      csrfToken: getCsrfCookie(req),
      refreshed: Boolean(session.refreshed),
    })
  },
  { methods: ['GET'] },
)
