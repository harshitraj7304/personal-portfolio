/**
 * Supabase client factories.
 *
 * Two clients, two privilege levels. Which one a handler picks is the single
 * most consequential security decision in that handler, so they are named to
 * make the choice explicit at every call site.
 *
 *   supabaseForToken(jwt)  role `authenticated`  → RLS APPLIES
 *   supabaseAdmin()        role `service_role`   → RLS BYPASSED
 *
 * Default to supabaseForToken. Most projects use the service-role key
 * everywhere and let handler code do all the authorizing, which makes every
 * handler a potential total compromise. Running admin data access as the user's
 * own JWT means the database re-checks every row independently — a handler bug
 * then yields an empty result set rather than someone else's documents.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from './env.js'

// Serverless functions are reused across invocations, so caching the client
// avoids rebuilding it on every warm request.
let adminClient = null

const BASE_OPTIONS = {
  auth: {
    // There is no browser here: nothing to persist a session into, no URL to
    // detect a session from, and refresh is driven explicitly by our own
    // /api/auth/session endpoint.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}

/**
 * Service-role client. Bypasses RLS completely.
 *
 * Legitimate uses, and only these:
 *   - Supabase Auth admin operations (create user, update password)
 *   - rate-limit counters and login_attempts (tables with no RLS policy)
 *   - audit log writes (must succeed even when the actor's own access fails)
 *   - signing storage URLs after the handler has already authorized the request
 *
 * If you reach for this to read or write content, that is a design smell — use
 * the user's token so RLS stays in the loop.
 */
export function supabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, BASE_OPTIONS)
  }
  return adminClient
}

/**
 * Client acting as the signed-in user. RLS applies to every query.
 *
 * Not cached: the token differs per request, and a cached client would leak one
 * request's identity into another.
 */
export function supabaseForToken(accessToken) {
  if (!accessToken) throw new Error('supabaseForToken requires an access token')

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...BASE_OPTIONS,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Anonymous client — role `anon`, subject to the anon RLS policies.
 *
 * This is what the public AI assistant uses. Because migration 0007 grants anon
 * no policy on documents, files, photos, albums, contact_messages or
 * admin_users, that endpoint has no reachable path to private data at all.
 * Isolation by absence of capability, not by instruction.
 */
export function supabaseAnon() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, BASE_OPTIONS)
}

/**
 * Unwrap a PostgREST result, converting an error into a throw.
 *
 * Supabase returns `{ data, error }` rather than rejecting, which makes it easy
 * to accidentally treat a failed query as an empty one. This makes failure loud.
 */
export function unwrap({ data, error }, context = 'query') {
  if (error) {
    const err = new Error(`Supabase ${context} failed: ${error.message}`)
    err.cause = error
    err.supabaseCode = error.code
    throw err
  }
  return data
}
